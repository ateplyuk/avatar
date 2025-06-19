import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
from pydantic import BaseModel
from uuid import uuid4
import logging
import fal_client
import httpx
from ..storage import task_status_db
from ..fal_initializer import setup_fal_key
from ..utils import upload_image_to_presigned_url
from ..config import ESRGAN_MODEL

router = APIRouter()
logger = logging.getLogger(__name__)

class UpscaleRequest(BaseModel):
    image_url: str
    scale: Optional[float] = 2
    model: Optional[str] = "RealESRGAN_x4plus"
    output_format: Optional[str] = "png"
    writeUrl: str
    readUrl: str
    avatar_id: str

class UpscaleResponse(BaseModel):
    aige_task_id: str
    avatar_id: str

def on_fal_queue_update(update, task_id):
    if isinstance(update, fal_client.InProgress):
        for log_entry in update.logs:
            logger.info(f"Task {task_id} - Fal.ai upscale update: {log_entry.get('message', 'No message in log')}")

async def run_upscale_task(task_id: str, avatar_id_from_path: str, request_data: UpscaleRequest):
    logger.info(f"Starting upscale for task {task_id} (Avatar ID: {avatar_id_from_path})")
    setup_fal_key()
    try:
        try:
            if avatar_id_from_path != request_data.avatar_id:
                logger.warning(f"Task {task_id}: Avatar ID mismatch - path '{avatar_id_from_path}', body '{request_data.avatar_id}'. Using ID from path.")
            task_status_db[task_id] = "processing_upscale"
            logger.info(f"Task {task_id}: Calling Fal.ai model fal-ai/esrgan...")

            upscale_args = {
                "image_url": request_data.image_url,
                "scale": request_data.scale,
                "model": request_data.model,
                "output_format": request_data.output_format
            }

            result = await asyncio.to_thread(
                fal_client.subscribe,
                ESRGAN_MODEL,
                arguments=upscale_args,
                with_logs=True,
                on_queue_update=lambda update: on_fal_queue_update(update, task_id)
            )

            if not result or not result.get("image") or not result["image"].get("url"):
                raise Exception("Upscale failed or returned no image.")

            image_url = result["image"]["url"]
            logger.info(f"Task {task_id}: Fal.ai model fal-ai/esrgan completed. Image URL: {image_url}")

            task_status_db[task_id] = "uploading_image"
            logger.info(f"Task {task_id}: Downloading image from {image_url} for upload.")

            async with httpx.AsyncClient() as client:
                response = await client.get(image_url)
                response.raise_for_status()
                image_data = response.content
                content_type = response.headers.get("Content-Type", f"image/{request_data.output_format}")

            logger.info(f"Task {task_id}: Uploading image to {request_data.writeUrl} (Content-Type: {content_type})")
            await upload_image_to_presigned_url(request_data.writeUrl, image_data, content_type)
            logger.info(f"Task {task_id}: Upload to {request_data.writeUrl} completed.")
            task_status_db[task_id] = "done"
            logger.info(f"Upscale task {task_id} for avatar {avatar_id_from_path} completed successfully. Final image accessible via readUrl: {request_data.readUrl}")
        except Exception as e:
            logger.error(f"Error in upscale task {task_id}: {e}", exc_info=True)
            task_status_db[task_id] = "error"
            raise
    except Exception:
        pass

@router.put("/avatar/{avatar_id_in_path}/upscaled", response_model=UpscaleResponse)
async def upscale_avatar_endpoint(avatar_id_in_path: str, request: UpscaleRequest, background_tasks: BackgroundTasks):
    if avatar_id_in_path != request.avatar_id:
        raise HTTPException(
            status_code=400,
            detail=f"Avatar ID mismatch: path parameter '{avatar_id_in_path}' does not match request body '{request.avatar_id}'"
        )
    aige_task_id = str(uuid4())
    task_status_db[aige_task_id] = "pending"
    logger.info(f"Upscale task {aige_task_id} created for avatar {avatar_id_in_path}.")
    background_tasks.add_task(run_upscale_task, aige_task_id, avatar_id_in_path, request)
    return UpscaleResponse(
        aige_task_id=aige_task_id,
        avatar_id=avatar_id_in_path
    ) 