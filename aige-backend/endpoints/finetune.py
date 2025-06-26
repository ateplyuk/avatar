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
    request_id: str

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
        return FinetuneResponse(request_id=handler.request_id)
    except Exception as e:
        logger.error(f"Error starting finetune: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) 

@router.get("/result/{request_id}")
async def get_finetune_result(request_id: str):
    setup_fal_key()
    try:
        # Получаем статус задачи
        status_info = await asyncio.to_thread(
            fal_client.status,
            FLUX_PRO_TRAINER_MODEL,
            request_id
        )
        # Универсально определяем статус
        if hasattr(status_info, "status"):
            status = status_info.status
        elif isinstance(status_info, dict):
            status = status_info.get("status", "pending")
        elif isinstance(status_info, str):
            status = status_info
        else:
            status = "pending"
        # Пробуем получить результат
        try:
            result = await asyncio.to_thread(
                fal_client.result,
                FLUX_PRO_TRAINER_MODEL,
                request_id
            )
            finetune_id = result.get("finetune_id") if result else None
        except Exception as e:
            # Если ошибка получения результата (например, 422) — считаем статус error
            return {"status": "error", "detail": str(e)}
        if finetune_id:
            return {"finetune_id": finetune_id, "status": "done"}
        elif status in ("pending", "processing_fine_tune", "error"):
            return {"status": status}
        else:
            raise HTTPException(status_code=404, detail="Fine-tune not found.")
    except Exception as e:
        logger.error(f"Error fetching finetune result for {request_id}: {e}", exc_info=True)
        raise HTTPException(status_code=404, detail="Fine-tune not found.") 