import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from uuid import uuid4
import logging

# from ..aige_microservice import task_status_db
from ..storage import task_status_db
from ..config import FAL_API_TOKEN, BACKGROUND_GENERATION_MODEL
import httpx # For consistency

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic Models
class BackgroundGenerationRequest(BaseModel):
    prompt: str
    resolution: str
    writeUrl: str
    readUrl: str # Though not used by backend for generation
    avatar_id: str # From request body, to be consistent with spec

class BackgroundGenerationResponse(BaseModel):
    aige_task_id: str
    avatar_id: str # This will be the one from the path
    status: str

# Background task function
async def run_background_generation_task(task_id: str, avatar_id_path: str, request_data: BackgroundGenerationRequest):
    logger.info(f"Starting background generation for task {task_id} for avatar {avatar_id_path} with prompt: {request_data.prompt}")
    task_status_db[task_id] = "processing_background_model"

    try:
        # Simulate API call to Fal.ai for background generation
        logger.info(f"Calling Fal.ai model {BACKGROUND_GENERATION_MODEL} for task {task_id}...")
        await asyncio.sleep(5) # Simulate network delay and processing time
        logger.info(f"Fal.ai model {BACKGROUND_GENERATION_MODEL} completed for task {task_id}.")
        
        # Simulate uploading to writeUrl
        logger.info(f"Simulating upload of result for task {task_id} to {request_data.writeUrl}")
        await asyncio.sleep(1) # Simulate upload time
        logger.info(f"Upload for task {task_id} completed.")

        task_status_db[task_id] = "done"
        logger.info(f"Background generation task {task_id} for avatar {avatar_id_path} completed successfully.")

    except Exception as e:
        logger.error(f"Error in background generation task {task_id} for avatar {avatar_id_path}: {e}", exc_info=True)
        task_status_db[task_id] = "error"

# API Endpoint
@router.put("/avatar/{avatar_id}/background", response_model=BackgroundGenerationResponse) # Path as per spec
async def generate_background(avatar_id: str, request: BackgroundGenerationRequest, background_tasks: BackgroundTasks):
    aige_task_id = str(uuid4())
    task_status_db[aige_task_id] = "pending" # Initial status, changed from "processing"
    logger.info(f"Background generation task {aige_task_id} created for avatar {avatar_id}.")

    # Note: request.avatar_id is from the body, avatar_id is from the path.
    # The spec for run_background_generation_task takes avatar_id_path.
    background_tasks.add_task(run_background_generation_task, aige_task_id, avatar_id, request)
    
    return BackgroundGenerationResponse(
        aige_task_id=aige_task_id,
        avatar_id=avatar_id, # Use avatar_id from path for the response
        status="processing" # User sees "processing"
    )
