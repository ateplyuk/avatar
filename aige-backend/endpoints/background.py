import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
from pydantic import BaseModel
from uuid import uuid4
import logging
import fal_client # Import fal_client
import httpx # To download image from fal result URL

from ..storage import task_status_db
from ..config import BACKGROUND_GENERATION_MODEL
from ..fal_initializer import setup_fal_key # Import the setup function
# utils.py will be created in a later step, this import is anticipatory
from ..utils import upload_image_to_presigned_url 

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic Models
class BackgroundGenerationRequest(BaseModel):
    prompt: str
    aspect_ratio: Optional[str] = "1:1"  # Значение по умолчанию
    writeUrl: str
    readUrl: str 
    avatar_id: str # From request body, validated against path param

class BackgroundGenerationResponse(BaseModel):
    aige_task_id: str
    avatar_id: str 
    status: str

def on_fal_queue_update(update, task_id, step_name):
    if isinstance(update, fal_client.InProgress):
        for log_entry in update.logs:
            logger.info(f"Task {task_id} - Fal.ai {step_name} update: {log_entry.get('message', 'No message in log')}")
    # Potentially handle other update types

async def run_background_generation_task(task_id: str, avatar_id_from_path: str, request_data: BackgroundGenerationRequest):
    logger.info(f"Starting background generation for task {task_id} (Avatar ID: {avatar_id_from_path}) with prompt: {request_data.prompt}")
    setup_fal_key() # Ensure FAL_KEY is set

    if avatar_id_from_path != request_data.avatar_id:
        logger.warning(f"Task {task_id}: Avatar ID mismatch - path '{avatar_id_from_path}', body '{request_data.avatar_id}'. Using ID from path.")
        # Or raise HTTPException: raise HTTPException(status_code=400, detail="Avatar ID mismatch between path and body.")
        # For now, proceed with path, but log warning.

    try:
        task_status_db[task_id] = "processing_background_model"
        logger.info(f"Task {task_id}: Calling Fal.ai model {BACKGROUND_GENERATION_MODEL}...")

        background_model_args = {
            "prompt": request_data.prompt,
            "aspect_ratio": request_data.aspect_ratio,
            "num_inference_steps": 10, # Increased from 2 for potentially better quality
            "guidance_scale": 3.5,
            "num_images": 1,
            "safety_tolerance": "2.0", # String as per some fal examples for tolerance
            "output_format": "jpeg" # imagen4 produces jpeg or png
        }
        
        generated_image_result = await asyncio.to_thread(
            fal_client.subscribe,
            BACKGROUND_GENERATION_MODEL,
            arguments=background_model_args,
            with_logs=True,
            on_queue_update=lambda update: on_fal_queue_update(update, task_id, "background_generation")
        )

        if not generated_image_result or not generated_image_result.get("images"):
            raise Exception("Background generation failed or returned no image.")
        
        # Assuming the first image is the one we want
        image_url = generated_image_result["images"][0]["url"]
        logger.info(f"Task {task_id}: Fal.ai model {BACKGROUND_GENERATION_MODEL} completed. Image URL: {image_url}")
        
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
        logger.info(f"Background generation task {task_id} for avatar {avatar_id_from_path} completed successfully. Final image accessible via readUrl: {request_data.readUrl}")

    except fal_client.FalServerException as e:
        logger.error(f"FalServerException in background generation task {task_id}: {e.message} (status {e.status_code})", exc_info=True)
        task_status_db[task_id] = "error"
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTPStatusError during image download/upload for task {task_id}: {e.response.status_code} - {e.response.text}", exc_info=True)
        task_status_db[task_id] = "error"
    except Exception as e:
        logger.error(f"Generic error in background generation task {task_id} for avatar {avatar_id_from_path}: {e}", exc_info=True)
        task_status_db[task_id] = "error"

# API Endpoint
@router.put("/avatar/{avatar_id_in_path}/background", response_model=BackgroundGenerationResponse)
async def generate_background_endpoint(avatar_id_in_path: str, request: BackgroundGenerationRequest, background_tasks: BackgroundTasks):
    # Validate avatar_id from path against avatar_id in body (as per original endpoint structure)
    if avatar_id_in_path != request.avatar_id:
        raise HTTPException(
            status_code=400, 
            detail=f"Avatar ID mismatch: path parameter '{avatar_id_in_path}' does not match request body '{request.avatar_id}'"
        )

    aige_task_id = str(uuid4())
    task_status_db[aige_task_id] = "pending"
    logger.info(f"Background generation task {aige_task_id} created for avatar {avatar_id_in_path}. Prompt: '{request.prompt[:50]}...'")

    background_tasks.add_task(run_background_generation_task, aige_task_id, avatar_id_in_path, request)
    
    return BackgroundGenerationResponse(
        aige_task_id=aige_task_id,
        avatar_id=avatar_id_in_path, 
        status="processing"
    )
