# Technical Context

## Technology Stack
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Dependencies**:
  - fastapi
  - uvicorn[standard]
  - httpx
  - python-multipart
  - pydantic
  - fal-client

## Development Setup
- Python-based microservice
- Running on port 8000
- CORS enabled for frontend integration
- In-memory task status storage

## Technical Constraints
- Memory-based storage (no persistent database)
- Single server deployment
- Synchronous API endpoints
- External dependency on fal-client for image generation

## API Structure
- Base URL: `/api/v1`
- Endpoints:
  - `/task` - Task status management
  - `/avatar` - Avatar generation
  - `/background` - Background generation

## Development Environment
- Linux environment (5.15.0-75-generic)
- Python-based development
- FastAPI for API development
- Uvicorn for ASGI server 