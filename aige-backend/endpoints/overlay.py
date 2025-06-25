import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
from pydantic import BaseModel
from uuid import uuid4
import logging
import fal_client
import httpx
from PIL import Image
from io import BytesIO

from ..storage import task_status_db
from ..config import OVERLAY_MODEL
from ..fal_initializer import setup_fal_key
from ..utils import upload_image_to_presigned_url

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic Models
class Position(BaseModel):
    x: float
    y: float
    scale: float

class OverlayParams(BaseModel):
    person: str
    background: str
    position: Position

class OverlayRequest(BaseModel):
    prompt: str
    aspect_ratio: Optional[str] = "square"  # Значение по умолчанию, allowed values ["square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9"]
    params: OverlayParams
    writeUrl: str
    readUrl: str
    avatar_id: str

class OverlayResponse(BaseModel):
    aige_task_id: str
    avatar_id: str

def on_fal_queue_update(update, task_id, step_name):
    if isinstance(update, fal_client.InProgress):
        for log_entry in update.logs:
            logger.info(f"Task {task_id} - Fal.ai {step_name} update: {log_entry.get('message', 'No message in log')}")

async def run_overlay_task(task_id: str, avatar_id_from_path: str, request_data: OverlayRequest):
    logger.info(f"Starting overlay generation for task {task_id} (Avatar ID: {avatar_id_from_path}) with prompt: {request_data.prompt}")
    setup_fal_key()

    try:
        try:
            if avatar_id_from_path != request_data.avatar_id:
                logger.warning(f"Task {task_id}: Avatar ID mismatch - path '{avatar_id_from_path}', body '{request_data.avatar_id}'. Using ID from path.")
            task_status_db[task_id] = "processing_overlay"
            logger.info(f"Task {task_id}: Preparing person image with position and scale...")

            # 1. Download background and person images
            async with httpx.AsyncClient() as client:
                bg_resp = await client.get(request_data.params.background)
                bg_resp.raise_for_status()
                bg_bytes = bg_resp.content
                person_resp = await client.get(request_data.params.person)
                person_resp.raise_for_status()
                person_bytes = person_resp.content

            # 2. Open images with PIL
            bg_img = Image.open(BytesIO(bg_bytes)).convert('RGB')
            person_img = Image.open(BytesIO(person_bytes)).convert('RGBA')
            bg_w, bg_h = bg_img.size

            # 3. Prepare white canvas
            canvas = Image.new('RGB', (bg_w, bg_h), (255, 255, 255))

            # 4. Scale person
            scale = request_data.params.position.scale
            person_w, person_h = person_img.size
            new_w = int(person_w * scale)
            new_h = int(person_h * scale)
            try:
                resample = Image.Resampling.LANCZOS
            except AttributeError:
                resample = Image.ANTIALIAS
            person_img = person_img.resize((new_w, new_h), resample)

            # 5. Compute position (absolute values)
            # Extract positioning parameters
            x_offset = request_data.params.position.x
            y_offset = request_data.params.position.y
            scale = request_data.params.position.scale
            
            # Calculate new dimensions with scale
            new_w = int(person_w * scale)
            new_h = int(person_h * scale)
            
            # Calculate position for placing person with offset
            # Center of background + offset - half width/height of person
            paste_x = int((bg_w // 2) - (new_w // 2) + x_offset)
            paste_y = int((bg_h // 2) - (new_h // 2) + y_offset)

            # 6. Paste person onto canvas
            canvas.paste(person_img, (paste_x, paste_y), person_img)

            # 7. Save to bytes
            out_buf = BytesIO()
            canvas.save(out_buf, format='JPEG')
            out_buf.seek(0)
            composed_bytes = out_buf.read()

            # 8. Upload to S3 (use writeUrl as temp, or generate new if needed)
            # We'll use the same writeUrl as for overlay, or you can generate a new one if needed
            # Here, for simplicity, use writeUrl
            await upload_image_to_presigned_url(request_data.writeUrl, composed_bytes, 'image/jpeg')
            logger.info(f"Task {task_id}: Composed person image uploaded to {request_data.writeUrl}")

            # 9. Use readUrl as the image_url for overlay
            composed_image_url = request_data.readUrl

            logger.info(f"Task {task_id}: Calling Fal.ai model {OVERLAY_MODEL}...")

            overlay_model_args = {
                "prompt": request_data.prompt,
                "image_size": request_data.aspect_ratio,
                "image_url": composed_image_url,
                "background_threshold": 0.67,
                "num_inference_steps": 28,
                "initial_latent": "None",
                "num_images": 1,
                "cfg": 1,
                "lowres_denoise": 0.98,
                "highres_denoise": 0.95,
                "hr_downscale": 0.5,
                "guidance_scale": 5,
                "enable_safety_checker": "true",
                "output_format": "jpeg"
            }

            generated_image_result = await asyncio.to_thread(
                fal_client.subscribe,
                OVERLAY_MODEL,
                arguments=overlay_model_args,
                with_logs=True,
                on_queue_update=lambda update: on_fal_queue_update(update, task_id, "overlay_generation")
            )

            if not generated_image_result or not generated_image_result.get("images"):
                raise Exception("Overlay generation failed or returned no image.")
            
            image_url = generated_image_result["images"][0]["url"]
            logger.info(f"Task {task_id}: Fal.ai model {OVERLAY_MODEL} completed. Image URL: {image_url}")

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
            logger.info(f"Overlay generation task {task_id} for avatar {avatar_id_from_path} completed successfully. Final image accessible via readUrl: {request_data.readUrl}")

        except Exception as e:
            logger.error(f"Error in overlay generation task {task_id}: {e}", exc_info=True)
            task_status_db[task_id] = "error"
            raise
    except Exception:
        # Уже установлен статус error, просто выходим
        pass

@router.put("/avatar/{avatar_id_in_path}/overlay", response_model=OverlayResponse)
async def generate_overlay_endpoint(avatar_id_in_path: str, request: OverlayRequest, background_tasks: BackgroundTasks):
    if avatar_id_in_path != request.avatar_id:
        raise HTTPException(
            status_code=400,
            detail=f"Avatar ID mismatch: path parameter '{avatar_id_in_path}' does not match request body '{request.avatar_id}'"
        )

    aige_task_id = str(uuid4())
    task_status_db[aige_task_id] = "pending"
    logger.info(f"Overlay generation task {aige_task_id} created for avatar {avatar_id_in_path}. Prompt: '{request.prompt[:50]}...'")

    background_tasks.add_task(run_overlay_task, aige_task_id, avatar_id_in_path, request)

    return OverlayResponse(
        aige_task_id=aige_task_id,
        avatar_id=avatar_id_in_path
    ) 