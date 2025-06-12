import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging
import fal_client
from ..config import FLUX_PRO_TRAINER_MODEL
from ..fal_initializer import setup_fal_key

router = APIRouter()
logger = logging.getLogger(__name__)

class FinetuneRequest(BaseModel):
    data_url: str
    finetune_comment: Optional[str] = None
    mode: Optional[str] = "character"
    trigger_word: Optional[str] = "TOM4S"
    iterations: Optional[int] = 300
    priority: Optional[str] = "quality"
    captioning: Optional[bool] = True
    lora_rank: Optional[int] = 32
    finetune_type: Optional[str] = "full"

class FinetuneResponse(BaseModel):
    finetune_id: str

@router.post("/", response_model=FinetuneResponse)
async def start_finetune(request: FinetuneRequest):
    setup_fal_key()
    try:
        arguments = {
            "data_url": request.data_url,
            "mode": request.mode,
            "finetune_comment": request.finetune_comment or "AIGE finetune",
            "iterations": request.iterations,
            "priority": request.priority,
            "captioning": request.captioning,
            "trigger_word": request.trigger_word,
            "lora_rank": request.lora_rank,
            "finetune_type": request.finetune_type
        }
        handler = await asyncio.to_thread(
            fal_client.submit,
            FLUX_PRO_TRAINER_MODEL,
            arguments=arguments
        )
        logger.info(f"Started finetune: {handler.request_id}")
        return FinetuneResponse(finetune_id=handler.request_id)
    except Exception as e:
        logger.error(f"Error starting finetune: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) 

@router.get("/result/{request_id}")
async def get_finetune_result(request_id: str):
    setup_fal_key()
    try:
        # fal_client.result может быть sync, поэтому используем to_thread
        result = await asyncio.to_thread(
            fal_client.result,
            FLUX_PRO_TRAINER_MODEL,
            request_id
        )
        # result должен содержать finetune_id, если готово
        finetune_id = result.get("finetune_id")
        if finetune_id:
            return {"finetune_id": finetune_id}
        else:
            raise HTTPException(status_code=404, detail="Fine-tune not completed yet.")
    except Exception as e:
        logger.error(f"Error fetching finetune result for {request_id}: {e}", exc_info=True)
        raise HTTPException(status_code=404, detail="Fine-tune not completed yet.") 