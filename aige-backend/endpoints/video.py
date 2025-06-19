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
from ..config import KLING_VIDEO_MODEL

router = APIRouter()
logger = logging.getLogger(__name__)

class VideoRequest(BaseModel):
    prompt: str
    input_img: str
    writeUrl: str
    readUrl: str
    avatar_id: str
    duration: Optional[str] = "5"
    negative_prompt: Optional[str] = "blur, distort, and low quality"
    cfg_scale: Optional[float] = 0.5

class VideoResponse(BaseModel):
    aige_task_id: str
    avatar_id: str

def on_fal_queue_update(update, task_id):
    if isinstance(update, fal_client.InProgress):
        for log_entry in update.logs:
            logger.info(f"Task {task_id} - Fal.ai video update: {log_entry.get('message', 'No message in log')}")

async def run_video_task(task_id: str, avatar_id_from_path: str, request_data: VideoRequest):
    logger.info(f"Starting video generation for task {task_id} (Avatar ID: {avatar_id_from_path})")
    setup_fal_key()
    try:
        try:
            if avatar_id_from_path != request_data.avatar_id:
                logger.warning(f"Task {task_id}: Avatar ID mismatch - path '{avatar_id_from_path}', body '{request_data.avatar_id}'. Using ID from path.")
            task_status_db[task_id] = "processing_video"
            logger.info(f"Task {task_id}: Calling Fal.ai model kling-video...")

            video_args = {
                "prompt": request_data.prompt,
                "image_url": request_data.input_img,
                "duration": request_data.duration,
                "negative_prompt": request_data.negative_prompt,
                "cfg_scale": request_data.cfg_scale
            }

            result = await asyncio.to_thread(
                fal_client.subscribe,
                KLING_VIDEO_MODEL,
                arguments=video_args,
                with_logs=True,
                on_queue_update=lambda update: on_fal_queue_update(update, task_id)
            )

            if not result or not result.get("video") or not result["video"].get("url"):
                raise Exception("Video generation failed or returned no video.")

            video_url = result["video"]["url"]
            logger.info(f"Task {task_id}: Fal.ai model kling-video completed. Video URL: {video_url}")

            task_status_db[task_id] = "uploading_video"
            logger.info(f"Task {task_id}: Downloading video from {video_url} for upload.")

            async with httpx.AsyncClient() as client:
                response = await client.get(video_url)
                response.raise_for_status()
                video_data = response.content
                content_type = response.headers.get("Content-Type", "video/mp4")

            logger.info(f"Task {task_id}: Uploading video to {request_data.writeUrl} (Content-Type: {content_type})")
            await upload_image_to_presigned_url(request_data.writeUrl, video_data, content_type)
            logger.info(f"Task {task_id}: Upload to {request_data.writeUrl} completed.")
            task_status_db[task_id] = "done"
            logger.info(f"Video task {task_id} for avatar {avatar_id_from_path} completed successfully. Final video accessible via readUrl: {request_data.readUrl}")
        except Exception as e:
            logger.error(f"Error in video task {task_id}: {e}", exc_info=True)
            task_status_db[task_id] = "error"
            raise
    except Exception:
        pass

@router.put("/avatar/{avatar_id_in_path}/video", response_model=VideoResponse)
async def video_avatar_endpoint(avatar_id_in_path: str, request: VideoRequest, background_tasks: BackgroundTasks):
    if avatar_id_in_path != request.avatar_id:
        raise HTTPException(
            status_code=400,
            detail=f"Avatar ID mismatch: path parameter '{avatar_id_in_path}' does not match request body '{request.avatar_id}'"
        )
    aige_task_id = str(uuid4())
    task_status_db[aige_task_id] = "pending"
    logger.info(f"Video task {aige_task_id} created for avatar {avatar_id_in_path}.")
    background_tasks.add_task(run_video_task, aige_task_id, avatar_id_in_path, request)
    return VideoResponse(
        aige_task_id=aige_task_id,
        avatar_id=avatar_id_in_path
    ) 