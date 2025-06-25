# Technical Context

## Technology Stack
### Backend
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Dependencies**:
  - fastapi
  - uvicorn[standard]
  - httpx
  - python-multipart
  - pydantic
  - fal-client

### Frontend
- **Framework**: React
- **Build Tool**: Vite
- **Dependencies**:
  - react
  - react-dom
  - axios
  - @mui/material
  - @emotion/react
  - @emotion/styled

## Development Setup
### Backend
- Python-based microservice
- Running on port 8000
- CORS enabled for frontend integration
- In-memory task status storage

### Frontend
- React-based SPA
- Running on port 5173 (development)
- Axios for API communication
- Material-UI for components

## Technical Constraints
- Memory-based storage (no persistent database)
- Single server deployment
- Synchronous API endpoints
- External dependency on fal-client for image generation
- Frontend-backend communication via REST API

## API Structure
### Base Configuration
- Base URL: `/api/v1`
- CORS enabled for frontend origin
- Standard HTTP methods supported

### Endpoints

#### Task Status
- **Endpoint**: `/task/{aige_task_id}/status`
  - **Method**: GET
  - Request Body: None
  - Response Body:
    ```json
    {
      "aige_task_id": "string",
      "status": "string"  // "pending", "processing_avatar_model", "processing_background_removal", "uploading_image", "done", "error"
    }
    ```
  - Status Codes:
    - 200: Task found
    - 404: Task not found

#### Avatar Generation
- **Endpoint**: `/avatar`
  - **Method**: POST
  - Request Body:
    ```json
    {
      "prompt": "string",
      "source_images": ["string"],  // Pre-signed URLs or base64 encoded strings
      "aspect_ratio": "string",     // Optional, default "1:1", allowed values 1:1, 16:9, 9:16, 3:4, 4:3
      "avatar_id": "string",
      "writeUrl": "string",         // Pre-signed URL for uploading the result
      "readUrl": "string"           // URL for reading the result
    }
    ```
  - Response Body:
    ```json
    {
      "aige_task_id": "string",
      "avatar_id": "string"
    }
    ```
  - Status Codes:
    - 201: Generation started
    - 500: Internal server error

#### Background Generation
- **Endpoint**: `/avatar/{avatar_id}/background`
  - **Method**: PUT
  - Request Body:
    ```json
    {
      "prompt": "string",
      "aspect_ratio": "string",     // Optional, default "1:1", allowed values 1:1, 16:9, 9:16, 3:4, 4:3
      "writeUrl": "string",         // Pre-signed URL for uploading the result
      "readUrl": "string",          // URL for reading the result
      "avatar_id": "string"         // Must match the avatar_id in the path
    }
    ```
  - Response Body:
    ```json
    {
      "aige_task_id": "string",
      "avatar_id": "string"
    }
    ```
  - Status Codes:
    - 200: Generation started
    - 400: Avatar ID mismatch
    - 500: Internal server error

#### Overlay Generation
- **Endpoint**: `/avatar/{avatar_id}/overlay`
  - **Method**: PUT
  - Request Body:
    ```json
    {
      "prompt": "string",
      "aspect_ratio": "string",     // Optional, default "1:1", allowed values [1:1, 16:9, 9:16, 3:4, 4:3]
      "params": {
        "person": "string",         // URL of the person image
        "background": "string",     // URL of the background image
        "position": {
          "x": number,              // X coordinate for positioning
          "y": number,              // Y coordinate for positioning
          "scale": number           // Scale factor for the person image
        }
      },
      "writeUrl": "string",         // Pre-signed URL for uploading the result
      "readUrl": "string",          // URL for reading the result
      "avatar_id": "string"         // Must match the avatar_id in the path
    }
    ```
  - Response Body:
    ```json
    {
      "aige_task_id": "string",
      "avatar_id": "string"
    }
    ```
  - Status Codes:
    - 200: Generation started
    - 400: Avatar ID mismatch
    - 500: Internal server error

#### Upscale Generation
- **Endpoint:** `/avatar/{avatar_id}/upscaled`
  - **Method**: PUT
  - **Purpose:** Upscales the overlayed image to a higher resolution.
  - Request Body:
  ```json
  {
    "image_url": "string",         // URL of the input image 
    "scale": 2,                     // Upscale factor (default: 2)
    "model": "RealESRGAN_x4plus",  // Upscale model (default: 'RealESRGAN_x4plus')
    "output_format": "png",        // Output image format ('png' or 'jpeg', default: 'png')
    "writeUrl": "string",          // S3 pre-signed URL for uploading the result
    "readUrl": "string",           // S3 pre-signed URL for reading the result
    "avatar_id": "string"          // Avatar identifier
  }
  ```
  - Response Body:
  ```json
  {
    "aige_task_id": "string",      // Task identifier for status polling
    "avatar_id": "string"          // Avatar identifier
  }
  ```
  - Status values:
    - `pending`: Task is queued
    - `processing_upscale`: Upscale in progress
    - `uploading_image`: Uploading upscaled image
    - `done`: Task completed successfully
    - `error`: Task failed

#### Video Generation
- **Endpoint:** `/avatar/{avatar_id}/video`
  - **Method**: PUT
  - **Purpose:** Generates a video from an input image and prompt.
  - Request Body:
  ```json
  {
    "prompt": "string",         // Text prompt for video generation
    "input_img": "string",      // URL of the input image
    "writeUrl": "string",       // S3 pre-signed URL for uploading the result
    "readUrl": "string",        // S3 pre-signed URL for reading the result
    "avatar_id": "string",      // Avatar identifier
    "duration": "5",            // (optional) Duration in seconds ("5" or "10")
    "negative_prompt": "blur, distort, and low quality", // (optional) Negative prompt
    "cfg_scale": 0.5             // (optional) CFG scale
  }
  ```
  - Response Body:
  ```json
  {
    "aige_task_id": "string",   // Task identifier for status polling
    "avatar_id": "string"       // Avatar identifier
  }
  ```
  - Status values:
    - `pending`: Task is queued
    - `processing_video`: Video generation in progress
    - `uploading_video`: Uploading generated video
    - `done`: Task completed successfully
    - `error`: Task failed

#### Reframe Generation
- **Endpoint:** `/avatar/{avatar_id}/reframe`
  - **Method**: PUT
  - **Purpose:** Reframes an image to a different aspect ratio using AI.
  - Request Body:
  ```json
  {
    "image_url": "string",         // URL of the input image to reframe
    "aspect_ratio": "string",      // Aspect ratio of the reframed image (default: "16:9") Allowed values: '1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '9:21'
    "prompt": "string",            // (optional) Prompt for reframing
    "grid_position_x": 0,          // (optional) X position of the grid for reframing
    "grid_position_y": 0,          // (optional) Y position of the grid for reframing
    "x_end": 100,                  // (optional) End X coordinate for reframing
    "x_start": 0,                  // (optional) Start X coordinate for reframing
    "y_end": 100,                  // (optional) End Y coordinate for reframing
    "y_start": 0,                  // (optional) Start Y coordinate for reframing
    "writeUrl": "string",          // Pre-signed URL for uploading the result
    "readUrl": "string",           // URL for reading the result
    "avatar_id": "string"          // Avatar identifier
  }
  ```
  - Response Body:
  ```json
  {
    "aige_task_id": "string",      // Task identifier for status polling
    "avatar_id": "string"          // Avatar identifier
  }
  ```
  - Status values:
    - `pending`: Task is queued
    - `processing_reframe_model`: Reframe in progress
    - `uploading_image`: Uploading reframed image
    - `done`: Task completed successfully
    - `error`: Task failed

#### Refine Generation (FLUX.1 Kontext Max)
- **Endpoint:** `/avatar/{avatar_id}/refine`
  - **Method**: PUT
  - **Purpose:** Editing an image.
  - Request Body:
  ```json
  {
    "prompt": "string",            // Prompt describing the edit
    "image_url": "string",         // URL of the input image to edit
    "aspect_ratio": "string",      // Aspect ratio of the output image (default: "1:1") Allowed values: '1:1', '16:9', '9:16', '4:3', '3:2', '2:3', '3:4', '21:9', '9:21'
    "guidance_scale": 3.5,          // (optional) CFG scale (default: 3.5)
    "num_images": 1,                // (optional) Number of images to generate (default: 1)
    "safety_tolerance": "2",       // (optional) Safety tolerance (default: "2")
    "output_format": "jpeg",       // (optional) Output format (default: "jpeg")
    "seed": 123,                    // (optional) Seed for reproducibility
    "writeUrl": "string",          // Pre-signed URL for uploading the result
    "readUrl": "string",           // URL for reading the result
    "avatar_id": "string"          // Avatar identifier
  }
  ```
  - Response Body:
  ```json
  {
    "aige_task_id": "string",      // Task identifier for status polling
    "avatar_id": "string"          // Avatar identifier
  }
  ```
  - Status values:
    - `pending`: Task is queued
    - `processing_refine_model`: Refine in progress
    - `uploading_image`: Uploading refined image
    - `done`: Task completed successfully
    - `error`: Task failed

### Task Status Values
  - pending: Task is queued
  - processing_avatar_model: Avatar generation in progress
  - processing_background_removal: Background removal in progress
  - processing_background_model: Background generation in progress
  - processing_overlay_model: Overlay generation in progress
  - processing_upscale: Upscale in progress
  - processing_video: Video generation in progress
  - processing_reframe_model: Reframe in progress
  - processing_refine_model: Refine in progress
  - uploading_image: Uploading generated image
  - uploading_video: Uploading generated video
  - done: Task completed successfully
  - error: Task failed

#### Fine-tune (FLUX.1 Pro Trainer)
- **Endpoint**: `/finetune`
  - **Method**: POST
  - Request Body:
    ```json
    {
      "data_url": "string",           // URL to the training data (S3 bucket with images)
      "finetune_comment": "string",   // Optional comment for the finetune job
      "mode": "string",               // Finetune mode (default: 'character')
      "trigger_word": "string",       // Trigger word (default: 'TOM4S')
      "iterations": 300,               // Number of iterations (default: 300)
      "priority": "string",           // Priority (default: 'quality')
      "captioning": true,              // Enable captioning (default: true)
      "lora_rank": 32,                 // LoRA rank (default: 32)
      "finetune_type": "string"       // Finetune type (default: 'full')
    }
    ```
  - Response Body:
    ```json
    {
      "finetune_id": "string"         // ID of the started fine-tune job
    }
    ```
  - Status Codes:
    - 200: Fine-tune started
    - 500: Internal server error

#### Fine-tune Result
- **Endpoint**: `/finetune/result/{request_id}`
  - **Method**: GET
  - Path Parameter:
    - `request_id`: string — идентификатор, полученный при запуске fine-tune
  - Response Body (если готово):
    ```json
    {
      "finetune_id": "string" // ID завершённого fine-tune
    }
    ```
  - Status Codes:
    - 200: Fine-tune завершён, finetune_id получен
    - 404: Fine-tune ещё не завершён или не найден

#### FLUX Ultra Generation (FLUX1.1 Pro Ultra-finetuned)
- **Endpoint**: `/flux-ultra`
  - **Method**: POST
  - Request Body:
    ```json
    {
      "prompt": "string",            // Prompt for image generation
      "finetune_id": "string",      // ID of the fine-tuned model
      "aspect_ratio": "string",     // Optional, default "1:1", allowed: "21:9", "16:9", "4:3", "3:2", "1:1", "2:3", "3:4", "9:16", "9:21"
      "output_format": "string",    // Optional, default "jpeg", allowed: "jpeg", "png"
      "num_images": 1,               // Optional, default 1
      "safety_tolerance": "string", // Optional, default "2", allowed: "1", "2", "3", "4", "5", "6"
      "seed": 123,                   // Optional, integer seed
      "finetune_strength": 0.5       // Fine-tune strength (0.0-1.0, float, required)
    }
    ```
  - Description: Запрос вызывает fal_client.submit (через to_thread), возвращает request_id из handler.request_id (реальный id задачи fal.ai, используемый для polling результата).
  - Response Body:
    ```json
    {
      "request_id": "string"           // fal.ai request_id для polling результата
    }
    ```
  - Status Codes:
    - 200: Generation started
    - 500: Internal server error

#### FLUX Ultra Result (Polling)
- **Endpoint**: `/flux-ultra/result/{request_id}`
  - **Method**: GET
  - Path Parameter:
    - `request_id`: string — идентификатор, полученный при запуске генерации (из fal_client.submit)
  - Description: Возвращает результат генерации через fal_client.result. Если задача не завершена — 404.
  - Response Body (если готово):
    ```json
    {
      "images": [
        {
          "url": "string",
          "width": 2048,
          "height": 2048,
          "content_type": "image/jpeg"
        }
      ],
      "timings": {},
      "seed": 123,
      "has_nsfw_concepts": [false],
      "prompt": "string"
    }
    ```
  - Status Codes:
    - 200: Generation завершена, результат получен
    - 404: Generation ещё не завершена или не найдена


