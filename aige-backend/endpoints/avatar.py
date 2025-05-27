import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List
from pydantic import BaseModel
import logging
from uuid import uuid4
import fal_client # Import fal_client
import httpx # To download image from fal result URL

from ..storage import task_status_db
from ..config import AVATAR_GENERATION_MODEL, BACKGROUND_REMOVAL_MODEL
from ..fal_initializer import setup_fal_key # Import the setup function
# utils.py will be created in a later step, this import is anticipatory
from ..utils import upload_image_to_presigned_url 

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic Models
class AvatarGenerationRequest(BaseModel):
    prompt: str
    source_images: List[str] # Assuming these are pre-signed URLs or base64 encoded strings. Currently unused by fal.ai calls.
    resolution: str
    avatar_id: str
    writeUrl: str
    readUrl: str 

class AvatarGenerationResponse(BaseModel):
    aige_task_id: str
    avatar_id: str
    status: str

def on_fal_queue_update(update, task_id, step_name):
    if isinstance(update, fal_client.InProgress):
        for log_entry in update.logs:
            logger.info(f"Task {task_id} - Fal.ai {step_name} update: {log_entry.get('message', 'No message in log')}")
    # Potentially handle other update types like fal_client.Queued, fal_client.Completed if needed
    # For now, focusing on InProgress logs as per user's example.

async def run_avatar_generation_task(task_id: str, request_data: AvatarGenerationRequest):
    logger.info(f"Starting avatar generation for task {task_id} with prompt: {request_data.prompt}")
    setup_fal_key() # Ensure FAL_KEY is set

    try:
        task_status_db[task_id] = "processing_avatar_model"
        logger.info(f"Task {task_id}: Calling Fal.ai model {AVATAR_GENERATION_MODEL}...")

        # Map resolution: "256" -> "256x256"
        image_size_str = f"{request_data.resolution}x{request_data.resolution}"
        # For imagen4, common resolutions might be "1024x1024", "2048x2048"
        # The model might have specific supported sizes, "SQUARE_HD" was an example for another model.
        # For now, we use what's provided, but this might need adjustment based on imagen4 capabilities.
        # Fal docs for imagen4 show aspect_ratio and num_images, not image_size directly in example.
        # Let's use aspect_ratio and assume resolution implies a square image.
        # Defaulting to "1:1" aspect ratio. The 'resolution' field might be used to pick a size from aspect_ratio variants if supported.
        # For now, the example used 'prompt' as the main argument.
        # The user's example for imagen4:
        # arguments={
        #     "prompt": prompt, "image_size": image_size, "num_inference_steps": 2,
        #     "guidance_scale": 3.5, "num_images": 1, "safety_tolerance": "2",
        #     "aspect_ratio": "1:1", "output_format": "jpeg"
        # }
        # The API docs for imagen4 had: prompt, negative_prompt, aspect_ratio, num_images, seed
        # Let's stick to user's example for arguments for now.

        avatar_model_args = {
            "prompt": request_data.prompt,
            # "image_size": {"width": int(request_data.resolution), "height": int(request_data.resolution)}, # Fal expects object for image_size for some models
            "aspect_ratio": "1:1", # Assuming square based on resolution
            "num_inference_steps": 10, # Increased from 2 for potentially better quality
            "guidance_scale": 3.5,
            "num_images": 1,
            "safety_tolerance": "2.0", # String as per some fal examples for tolerance
            "output_format": "jpeg" # imagen4 produces jpeg or png
        }
        # If 'resolution' is small like 256, it might be better to use a model optimized for that or upscale later.
        # For imagen4, it's a high-res model. Let's assume the user provides a reasonable resolution like 1024.
        # The 'image_size' parameter might be specific to certain fal client versions or models.
        # The fal.ai documentation for imagen4/preview API lists 'aspect_ratio' not 'image_size'.
        # Let's remove image_size if aspect_ratio is used and resolution is implicitly handled.
        # If resolution is "256", it implies a 256x256 image with 1:1 aspect ratio.
        # The model might select the closest supported resolution for the aspect ratio.

        generated_image_result = await asyncio.to_thread(
            fal_client.subscribe,
            AVATAR_GENERATION_MODEL,
            arguments=avatar_model_args,
            with_logs=True,
            on_queue_update=lambda update: on_fal_queue_update(update, task_id, "avatar_generation")
        )

        if not generated_image_result or not generated_image_result.get("images"):
            raise Exception("Avatar generation failed or returned no image.")
        
        # Assuming the first image is the one we want
        generated_image_url = generated_image_result["images"][0]["url"]
        logger.info(f"Task {task_id}: Fal.ai model {AVATAR_GENERATION_MODEL} completed. Image URL: {generated_image_url}")
        
        task_status_db[task_id] = "processing_background_removal"
        logger.info(f"Task {task_id}: Calling Fal.ai model {BACKGROUND_REMOVAL_MODEL} for image: {generated_image_url}")

        # User's example for rembg:
        # arguments={ "image_url": uploaded_url, "output_format": "png" }
        bg_removal_args = {
            "image_url": generated_image_url,
            "output_format": "png" # Need PNG for transparency
        }
        
        removed_bg_image_result = await asyncio.to_thread(
            fal_client.subscribe,
            BACKGROUND_REMOVAL_MODEL,
            arguments=bg_removal_args,
            with_logs=True,
            on_queue_update=lambda update: on_fal_queue_update(update, task_id, "background_removal")
        )

        if not removed_bg_image_result or not removed_bg_image_result.get("image"): # rembg returns "image" key
             raise Exception("Background removal failed or returned no image.")

        final_image_url = removed_bg_image_result["image"]["url"] # rembg output structure
        logger.info(f"Task {task_id}: Fal.ai model {BACKGROUND_REMOVAL_MODEL} completed. Final image URL: {final_image_url}")

        task_status_db[task_id] = "uploading_image"
        logger.info(f"Task {task_id}: Downloading image from {final_image_url} for upload.")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(final_image_url)
            response.raise_for_status() # Ensure we got a 2xx response
            image_data = response.content
            content_type = response.headers.get("Content-Type", "image/png") # Get content type, default to png

        logger.info(f"Task {task_id}: Uploading image to {request_data.writeUrl} (Content-Type: {content_type})")
        
        # This function will be fully implemented in a later step
        await upload_image_to_presigned_url(request_data.writeUrl, image_data, content_type)
        
        logger.info(f"Task {task_id}: Upload to {request_data.writeUrl} completed.")
        task_status_db[task_id] = "done"
        logger.info(f"Avatar generation task {task_id} completed successfully. Final image accessible via readUrl: {request_data.readUrl}")

    except fal_client.FalServerException as e:
        logger.error(f"FalServerException in avatar generation task {task_id}: {e.message} (status {e.status_code})", exc_info=True)
        task_status_db[task_id] = "error"
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTPStatusError during image download/upload for task {task_id}: {e.response.status_code} - {e.response.text}", exc_info=True)
        task_status_db[task_id] = "error"
    except Exception as e:
        logger.error(f"Generic error in avatar generation task {task_id}: {e}", exc_info=True)
        task_status_db[task_id] = "error"

# API Endpoint
@router.post("", response_model=AvatarGenerationResponse) # Changed from "/avatar" to "" as prefix is in main router
async def generate_avatar_endpoint(request: AvatarGenerationRequest, background_tasks: BackgroundTasks):
    # Path is already /api/v1/avatar due to router setup in aige_microservice.py
    # api_router.include_router(avatar_router.router, prefix="/avatar", tags=["avatar"])
    aige_task_id = str(uuid4())
    # It's important that task_status_db is accessible and shared correctly if uvicorn runs multiple workers.
    # For now, assuming single worker or dict is managed by a process manager if scaled.
    task_status_db[aige_task_id] = "pending" 
    logger.info(f"Avatar generation task {aige_task_id} created for avatar {request.avatar_id}. Prompt: '{request.prompt[:50]}...'")

    background_tasks.add_task(run_avatar_generation_task, aige_task_id, request)
    
    return AvatarGenerationResponse(
        aige_task_id=aige_task_id,
        avatar_id=request.avatar_id,
        status="processing" 
    )
