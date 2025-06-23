import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
from pydantic import BaseModel
from uuid import uuid4
import logging
import fal_client
import httpx

from ..storage import task_status_db
from ..config import REFRAME_MODEL
from ..fal_initializer import setup_fal_key
from ..utils import upload_image_to_presigned_url

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic Models
class ReframeRequest(BaseModel):
    image_url: str
    aspect_ratio: str = "16:9"  # Default aspect ratio
    prompt: Optional[str] = None
    grid_position_x: Optional[int] = None
    grid_position_y: Optional[int] = None
    x_end: Optional[int] = None
    x_start: Optional[int] = None
    y_end: Optional[int] = None
    y_start: Optional[int] = None
    writeUrl: str
    readUrl: str
    avatar_id: str

class ReframeResponse(BaseModel):
    aige_task_id: str
    avatar_id: str

def on_fal_queue_update(update, task_id, step_name):
    if isinstance(update, fal_client.InProgress):
        for log_entry in update.logs:
            logger.info(f"Task {task_id} - Fal.ai {step_name} update: {log_entry.get('message', 'No message in log')}")

async def run_reframe_task(task_id: str, avatar_id_from_path: str, request_data: ReframeRequest):
    logger.info(f"Starting reframe task {task_id} (Avatar ID: {avatar_id_from_path}) with image_url: {request_data.image_url}")
    setup_fal_key()

    try:
        try:
            if avatar_id_from_path != request_data.avatar_id:
                logger.warning(f"Task {task_id}: Avatar ID mismatch - path '{avatar_id_from_path}', body '{request_data.avatar_id}'. Using ID from path.")
            
            task_status_db[task_id] = "processing_reframe_model"
            logger.info(f"Task {task_id}: Calling Fal.ai model {REFRAME_MODEL}...")

            reframe_model_args = {
                "image_url": request_data.image_url,
                "aspect_ratio": request_data.aspect_ratio
            }

            # Add optional parameters if provided
            if request_data.prompt:
                reframe_model_args["prompt"] = request_data.prompt
            if request_data.grid_position_x is not None:
                reframe_model_args["grid_position_x"] = request_data.grid_position_x
            if request_data.grid_position_y is not None:
                reframe_model_args["grid_position_y"] = request_data.grid_position_y
            if request_data.x_end is not None:
                reframe_model_args["x_end"] = request_data.x_end
            if request_data.x_start is not None:
                reframe_model_args["x_start"] = request_data.x_start
            if request_data.y_end is not None:
                reframe_model_args["y_end"] = request_data.y_end
            if request_data.y_start is not None:
                reframe_model_args["y_start"] = request_data.y_start

            reframe_result = await asyncio.to_thread(
                fal_client.subscribe,
                REFRAME_MODEL,
                arguments=reframe_model_args,
                with_logs=True,
                on_queue_update=lambda update: on_fal_queue_update(update, task_id, "reframe")
            )

            if not reframe_result or not reframe_result.get("images"):
                raise Exception("Reframe generation failed or returned no image.")

            # Get the first image from the result
            image_url = reframe_result["images"][0]["url"]
            logger.info(f"Task {task_id}: Fal.ai model {REFRAME_MODEL} completed. Image URL: {image_url}")

            task_status_db[task_id] = "uploading_image"
            logger.info(f"Task {task_id}: Downloading image from {image_url} for upload.")

            async with httpx.AsyncClient() as client:
                response = await client.get(image_url)
                response.raise_for_status()
                image_data = response.content
                content_type = response.headers.get("Content-Type", "image/png")

            logger.info(f"Task {task_id}: Uploading image to {request_data.writeUrl} (Content-Type: {content_type})")

            await upload_image_to_presigned_url(request_data.writeUrl, image_data, content_type)

            logger.info(f"Task {task_id}: Upload to {request_data.writeUrl} completed.")
            task_status_db[task_id] = "done"
            logger.info(f"Reframe task {task_id} for avatar {avatar_id_from_path} completed successfully. Final image accessible via readUrl: {request_data.readUrl}")

        except Exception as e:
            logger.error(f"Error in reframe task {task_id}: {e}", exc_info=True)
            task_status_db[task_id] = "error"
            raise
    except Exception:
        # Status already set to error, just exit
        pass

# API Endpoint
@router.put("/avatar/{avatar_id_in_path}/reframe", response_model=ReframeResponse)
async def reframe_endpoint(avatar_id_in_path: str, request: ReframeRequest, background_tasks: BackgroundTasks):
    # Validate avatar_id from path against avatar_id in body
    if avatar_id_in_path != request.avatar_id:
        raise HTTPException(
            status_code=400,
            detail=f"Avatar ID mismatch: path parameter '{avatar_id_in_path}' does not match request body '{request.avatar_id}'"
        )

    aige_task_id = str(uuid4())
    task_status_db[aige_task_id] = "pending"
    logger.info(f"Reframe task {aige_task_id} created for avatar {avatar_id_in_path}. Image URL: {request.image_url}")

    background_tasks.add_task(run_reframe_task, aige_task_id, avatar_id_in_path, request)

    return ReframeResponse(
        aige_task_id=aige_task_id,
        avatar_id=avatar_id_in_path
    ) 