import uvicorn
from fastapi import FastAPI, APIRouter
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create a FastAPI app instance
app = FastAPI()

# In-memory dictionary to store task statuses
task_status_db = {}

# Create a main router
api_router = APIRouter()

# Import endpoint routers
from .endpoints import status as status_router
from .endpoints import avatar as avatar_router
from .endpoints import background as background_router

# Simple root endpoint
@app.get("/")
async def root():
    return {"message": "AIGE Microservice is running"}

# Include endpoint routers
api_router.include_router(status_router.router, prefix="/task", tags=["status"])
api_router.include_router(avatar_router.router, prefix="/avatar", tags=["avatar"])
api_router.include_router(background_router.router, tags=["background"]) # Will be prefixed by /api/v1 from the main router

# Include the main api_router into the app with a global prefix
app.include_router(api_router, prefix="/api/v1")

if __name__ == "__main__":
    logger.info("AIGE Microservice starting...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
