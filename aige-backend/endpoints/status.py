from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
# from ..aige_microservice import task_status_db # Assuming direct import for now
from ..storage import task_status_db
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class TaskStatusResponse(BaseModel):
    aige_task_id: str
    status: str

@router.get("/{aige_task_id}/status", response_model=TaskStatusResponse)
async def get_task_status(aige_task_id: str):
    if aige_task_id in task_status_db:
        return TaskStatusResponse(aige_task_id=aige_task_id, status=task_status_db[aige_task_id])
    else:
        logger.info(f"Task status requested for unknown task_id: {aige_task_id}")
        raise HTTPException(status_code=404, detail="Task not found")
