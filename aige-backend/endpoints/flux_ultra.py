import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import logging
import fal_client
from ..config import FLUX_PRO_ULTRA_MODEL
from ..fal_initializer import setup_fal_key

router = APIRouter()
logger = logging.getLogger(__name__)

def on_fal_queue_update(update, task_id):
    if isinstance(update, fal_client.InProgress):
        for log_entry in update.logs:
            logger.info(f"Task {task_id} - Fal.ai flux-ultra update: {log_entry.get('message', 'No message in log')}")

class FluxUltraRequest(BaseModel):
    prompt: str
    finetune_id: str
    aspect_ratio: Optional[str] = "1:1"
    output_format: Optional[str] = "jpeg"
    num_images: Optional[int] = 1
    safety_tolerance: Optional[str] = "2"
    seed: Optional[int] = None
    finetune_strength: Optional[float] = 0.5

class FluxUltraResponse(BaseModel):
    request_id: str

async def run_flux_ultra_task(task_id: str, request_data: FluxUltraRequest, result_holder: dict):
    setup_fal_key()
    try:
        args = {
            "prompt": request_data.prompt,
            "finetune_id": request_data.finetune_id,
            "aspect_ratio": request_data.aspect_ratio,
            "output_format": request_data.output_format,
            "num_images": request_data.num_images,
            "safety_tolerance": request_data.safety_tolerance,
            "finetune_strength": request_data.finetune_strength,
        }
        if request_data.seed is not None:
            args["seed"] = request_data.seed
        result = await asyncio.to_thread(
            fal_client.subscribe,
            FLUX_PRO_ULTRA_MODEL,
            arguments=args,
            with_logs=True,
            on_queue_update=lambda update: on_fal_queue_update(update, task_id)
        )
        if result and result.get("images"):
            image_url = result["images"][0]["url"]
            result_holder["image_url"] = image_url
        else:
            result_holder["image_url"] = None
    except Exception as e:
        logger.error(f"Error in flux-ultra task {task_id}: {e}", exc_info=True)
        result_holder["image_url"] = None

from uuid import uuid4

@router.post("/", response_model=FluxUltraResponse)
async def generate_flux_ultra(request: FluxUltraRequest):
    setup_fal_key()
    try:
        args = {
            "prompt": request.prompt,
            "finetune_id": request.finetune_id,
            "aspect_ratio": request.aspect_ratio,
            "output_format": request.output_format,
            "num_images": request.num_images,
            "safety_tolerance": request.safety_tolerance,
            "finetune_strength": request.finetune_strength,
        }
        if request.seed is not None:
            args["seed"] = request.seed
        handler = await asyncio.to_thread(
            fal_client.submit,
            FLUX_PRO_ULTRA_MODEL,
            arguments=args
        )
        logger.info(f"Started FLUX Ultra generation: {handler.request_id}")
        return FluxUltraResponse(request_id=handler.request_id)
    except Exception as e:
        logger.error(f"Error starting FLUX Ultra generation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/result/{request_id}")
async def get_flux_ultra_result(request_id: str):
    setup_fal_key()
    try:
        result = await asyncio.to_thread(
            fal_client.result,
            FLUX_PRO_ULTRA_MODEL,
            request_id
        )
        if result and result.get("images"):
            return result
        else:
            raise HTTPException(status_code=404, detail="Generation not completed yet.")
    except Exception as e:
        logger.error(f"Error fetching FLUX Ultra result for {request_id}: {e}", exc_info=True)
        raise HTTPException(status_code=404, detail="Generation not completed yet.") 