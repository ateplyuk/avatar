import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List
from pydantic import BaseModel
import logging
from uuid import uuid4

from ..aige_microservice import task_status_db
from ..config import FAL_API_TOKEN, AVATAR_GENERATION_MODEL, BACKGROUND_REMOVAL_MODEL
import httpx # Included as per requirement, though not used for actual calls yet

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic Models
class AvatarGenerationRequest(BaseModel):
    prompt: str
    source_images: List[str] # Assuming these are pre-signed URLs or base64 encoded strings
    resolution: str
    avatar_id: str
    writeUrl: str
    readUrl: str # Though not used by backend for generation, it's in the spec

class AvatarGenerationResponse(BaseModel):
    aige_task_id: str
    avatar_id: str
    status: str

# Background task function
async def run_avatar_generation_task(task_id: str, request_data: AvatarGenerationRequest):
    logger.info(f"Starting avatar generation for task {task_id} with prompt: {request_data.prompt}")
    task_status_db[task_id] = "processing_avatar_model"

    try:
        # Simulate API call to Fal.ai for avatar generation
        logger.info(f"Calling Fal.ai model {AVATAR_GENERATION_MODEL} for task {task_id}...")
        await asyncio.sleep(5) # Simulate network delay and processing time
        logger.info(f"Fal.ai model {AVATAR_GENERATION_MODEL} completed for task {task_id}.")
        task_status_db[task_id] = "processing_background_removal"

        # Simulate API call to Fal.ai for background removal
        logger.info(f"Calling Fal.ai model {BACKGROUND_REMOVAL_MODEL} for task {task_id}...")
        await asyncio.sleep(3) # Simulate network delay and processing time
        logger.info(f"Fal.ai model {BACKGROUND_REMOVAL_MODEL} completed for task {task_id}.")
        
        # Simulate uploading to writeUrl
        logger.info(f"Simulating upload of result for task {task_id} to {request_data.writeUrl}")
        await asyncio.sleep(1) # Simulate upload time
        logger.info(f"Upload for task {task_id} completed.")

        task_status_db[task_id] = "done"
        logger.info(f"Avatar generation task {task_id} completed successfully.")

    except Exception as e:
        logger.error(f"Error in avatar generation task {task_id}: {e}", exc_info=True)
        task_status_db[task_id] = "error"

# API Endpoint
@router.post("/avatar", response_model=AvatarGenerationResponse)
async def generate_avatar(request: AvatarGenerationRequest, background_tasks: BackgroundTasks):
    aige_task_id = str(uuid4())
    task_status_db[aige_task_id] = "pending" # Initial status before background task starts
    logger.info(f"Avatar generation task {aige_task_id} created for avatar {request.avatar_id}.")

    background_tasks.add_task(run_avatar_generation_task, aige_task_id, request)
    
    return AvatarGenerationResponse(
        aige_task_id=aige_task_id,
        avatar_id=request.avatar_id,
        status="processing" # User sees "processing" while it's queued/running
    )
