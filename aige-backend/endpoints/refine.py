import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
from pydantic import BaseModel
from uuid import uuid4
import logging
import fal_client
import httpx

from ..storage import task_status_db
from ..config import REFINE_MODEL
from ..fal_initializer import setup_fal_key
from ..utils import upload_image_to_presigned_url

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic Models
class RefineRequest(BaseModel):
    prompt: str
    image_url: str
    aspect_ratio: Optional[str] = "1:1"
    guidance_scale: Optional[float] = 3.5
    num_images: Optional[int] = 1
    safety_tolerance: Optional[str] = "2"
    output_format: Optional[str] = "jpeg"
    seed: Optional[int] = None
    writeUrl: str
    readUrl: str
    avatar_id: str

class RefineResponse(BaseModel):
    aige_task_id: str
    avatar_id: str

def on_fal_queue_update(update, task_id, step_name):
    if isinstance(update, fal_client.InProgress):
        for log_entry in update.logs:
            logger.info(f"Task {task_id} - Fal.ai {step_name} update: {log_entry.get('message', 'No message in log')}")

async def run_refine_task(task_id: str, avatar_id_from_path: str, request_data: RefineRequest):
    logger.info(f"Starting refine for task {task_id} (Avatar ID: {avatar_id_from_path}) with prompt: {request_data.prompt}")
    setup_fal_key()
    try:
        try:
            if avatar_id_from_path != request_data.avatar_id:
                logger.warning(f"Task {task_id}: Avatar ID mismatch - path '{avatar_id_from_path}', body '{request_data.avatar_id}'. Using ID from path.")
            task_status_db[task_id] = "processing_refine_model"
            logger.info(f"Task {task_id}: Calling Fal.ai model {REFINE_MODEL}...")

            refine_args = {
                "prompt": request_data.prompt,
                "image_url": request_data.image_url,
                "aspect_ratio": request_data.aspect_ratio,
                "guidance_scale": request_data.guidance_scale,
                "num_images": request_data.num_images,
                "safety_tolerance": request_data.safety_tolerance,
                "output_format": request_data.output_format,
            }
            if request_data.seed is not None:
                refine_args["seed"] = request_data.seed

            refine_result = await asyncio.to_thread(
                fal_client.subscribe,
                REFINE_MODEL,
                arguments=refine_args,
                with_logs=True,
                on_queue_update=lambda update: on_fal_queue_update(update, task_id, "refine")
            )

            if not refine_result or not refine_result.get("images"):
                raise Exception("Refine generation failed or returned no image.")

            image_url = refine_result["images"][0]["url"]
            logger.info(f"Task {task_id}: Fal.ai model {REFINE_MODEL} completed. Image URL: {image_url}")

            task_status_db[task_id] = "uploading_image"
            logger.info(f"Task {task_id}: Downloading image from {image_url} for upload.")

            async with httpx.AsyncClient() as client:
                response = await client.get(image_url)
                response.raise_for_status()
                image_data = response.content
                content_type = response.headers.get("Content-Type", "image/jpeg")

            logger.info(f"Task {task_id}: Uploading image to {request_data.writeUrl} (Content-Type: {content_type})")
            await upload_image_to_presigned_url(request_data.writeUrl, image_data, content_type)
            logger.info(f"Task {task_id}: Upload to {request_data.writeUrl} completed.")
            task_status_db[task_id] = "done"
            logger.info(f"Refine task {task_id} for avatar {avatar_id_from_path} completed successfully. Final image accessible via readUrl: {request_data.readUrl}")
        except Exception as e:
            logger.error(f"Error in refine task {task_id}: {e}", exc_info=True)
            task_status_db[task_id] = "error"
            raise
    except Exception:
        pass

@router.put("/avatar/{avatar_id_in_path}/refine", response_model=RefineResponse)
async def refine_endpoint(avatar_id_in_path: str, request: RefineRequest, background_tasks: BackgroundTasks):
    if avatar_id_in_path != request.avatar_id:
        raise HTTPException(
            status_code=400,
            detail=f"Avatar ID mismatch: path parameter '{avatar_id_in_path}' does not match request body '{request.avatar_id}'"
        )
    aige_task_id = str(uuid4())
    task_status_db[aige_task_id] = "pending"
    logger.info(f"Refine task {aige_task_id} created for avatar {avatar_id_in_path}. Prompt: '{request.prompt[:50]}...'")
    background_tasks.add_task(run_refine_task, aige_task_id, avatar_id_in_path, request)
    return RefineResponse(
        aige_task_id=aige_task_id,
        avatar_id=avatar_id_in_path
    ) 