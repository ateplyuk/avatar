import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
from pydantic import BaseModel
from uuid import uuid4
import logging
import fal_client
import httpx

from ..storage import task_status_db
from ..config import OVERLAY_MODEL
from ..fal_initializer import setup_fal_key
from ..utils import upload_image_to_presigned_url

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic Models
class Position(BaseModel):
    x: float
    y: float
    scale: float

class OverlayParams(BaseModel):
    person: str
    background: str
    position: Position

class OverlayRequest(BaseModel):
    prompt: str
    aspect_ratio: Optional[str] = "landscape_16_9"  # Значение по умолчанию, allowed values ["square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9"]
    params: OverlayParams
    writeUrl: str
    readUrl: str
    avatar_id: str

class OverlayResponse(BaseModel):
    aige_task_id: str
    avatar_id: str
    status: str

def on_fal_queue_update(update, task_id, step_name):
    if isinstance(update, fal_client.InProgress):
        for log_entry in update.logs:
            logger.info(f"Task {task_id} - Fal.ai {step_name} update: {log_entry.get('message', 'No message in log')}")

async def run_overlay_task(task_id: str, avatar_id_from_path: str, request_data: OverlayRequest):
    logger.info(f"Starting overlay generation for task {task_id} (Avatar ID: {avatar_id_from_path}) with prompt: {request_data.prompt}")
    setup_fal_key()

    try:
        try:
            if avatar_id_from_path != request_data.avatar_id:
                logger.warning(f"Task {task_id}: Avatar ID mismatch - path '{avatar_id_from_path}', body '{request_data.avatar_id}'. Using ID from path.")
            task_status_db[task_id] = "processing_overlay"
            logger.info(f"Task {task_id}: Calling Fal.ai model {OVERLAY_MODEL}...")

            overlay_model_args = {
                "prompt": request_data.prompt,
                "image_size": request_data.aspect_ratio,
                "image_url": request_data.params.person,
                "background_threshold": 0.67,
                "num_inference_steps": 28,
                "initial_latent": "None",
                "num_images": 1,
                "cfg": 1,
                "lowres_denoise": 0.98,
                "highres_denoise": 0.95,
                "hr_downscale": 0.5,
                "guidance_scale": 5,
                "enable_safety_checker": "true",
                "output_format": "jpeg"
            }

            generated_image_result = await asyncio.to_thread(
                fal_client.subscribe,
                OVERLAY_MODEL,
                arguments=overlay_model_args,
                with_logs=True,
                on_queue_update=lambda update: on_fal_queue_update(update, task_id, "overlay_generation")
            )

            if not generated_image_result or not generated_image_result.get("images"):
                raise Exception("Overlay generation failed or returned no image.")
            
            image_url = generated_image_result["images"][0]["url"]
            logger.info(f"Task {task_id}: Fal.ai model {OVERLAY_MODEL} completed. Image URL: {image_url}")

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
            logger.info(f"Overlay generation task {task_id} for avatar {avatar_id_from_path} completed successfully. Final image accessible via readUrl: {request_data.readUrl}")

        except Exception as e:
            logger.error(f"Error in overlay generation task {task_id}: {e}", exc_info=True)
            task_status_db[task_id] = "error"
            raise
    except Exception:
        # Уже установлен статус error, просто выходим
        pass

@router.put("/avatar/{avatar_id_in_path}/overlay", response_model=OverlayResponse)
async def generate_overlay_endpoint(avatar_id_in_path: str, request: OverlayRequest, background_tasks: BackgroundTasks):
    if avatar_id_in_path != request.avatar_id:
        raise HTTPException(
            status_code=400,
            detail=f"Avatar ID mismatch: path parameter '{avatar_id_in_path}' does not match request body '{request.avatar_id}'"
        )

    aige_task_id = str(uuid4())
    task_status_db[aige_task_id] = "pending"
    logger.info(f"Overlay generation task {aige_task_id} created for avatar {avatar_id_in_path}. Prompt: '{request.prompt[:50]}...'")

    background_tasks.add_task(run_overlay_task, aige_task_id, avatar_id_in_path, request)

    return OverlayResponse(
        aige_task_id=aige_task_id,
        avatar_id=avatar_id_in_path,
        status="processing"
    ) 