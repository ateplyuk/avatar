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
      "aspect_ratio": "string",     // Optional, default "landscape_16_9", allowed values ["square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"]
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

### Task Status Values
- `pending`: Task is queued
- `processing_avatar_model`: Avatar generation in progress
- `processing_background_removal`: Background removal in progress
- `processing_overlay`: Overlay generation in progress
- `uploading_image`: Uploading generated image
- `done`: Task completed successfully
- `error`: Task failed

### API Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 404: Not Found
- 500: Internal Server Error

### Frontend API Integration
- Axios instance configured with base URL
- Error handling middleware
- Request/response interceptors
- Status code handling
- Loading state management

## Development Environment
- Linux environment (5.15.0-75-generic)
- Python-based backend development
- Node.js-based frontend development
- FastAPI for API development
- Uvicorn for ASGI server
- Vite for frontend development server 