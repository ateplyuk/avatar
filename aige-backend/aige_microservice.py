import uvicorn
from fastapi import FastAPI, APIRouter
import logging
from .storage import task_status_db
import sys
from fastapi.middleware.cors import CORSMiddleware

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Create a FastAPI app instance
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # или ["http://localhost:3000"] — адрес вашего фронта
    allow_credentials=True,
    allow_methods=["*"],  # или ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers=["*"],
)

# In-memory dictionary to store task statuses
# task_status_db = {}

# Create a main router
api_router = APIRouter()

# Import endpoint routers
from .endpoints import status as status_router
from .endpoints import avatar as avatar_router
from .endpoints import background as background_router
from .endpoints import overlay as overlay_router
from .endpoints import urls as urls_router
from .endpoints import finetune as finetune_router
from .endpoints import flux_ultra as flux_ultra_router
from .endpoints import upscale as upscale_router
from .endpoints import video as video_router
from .endpoints import reframe as reframe_router
from .endpoints import refine as refine_router

# Simple root endpoint
@app.get("/")
async def root():
    return {"message": "AIGE Microservice is running"}

# Include endpoint routers
# Will be prefixed by /api/v1 from the main router
api_router.include_router(status_router.router, prefix="/task", tags=["status"])
api_router.include_router(avatar_router.router, prefix="/avatar", tags=["avatar"])
api_router.include_router(background_router.router, tags=["background"]) 
api_router.include_router(overlay_router.router, tags=["overlay"])
api_router.include_router(urls_router.router, tags=["urls"])
api_router.include_router(finetune_router.router, prefix="/finetune", tags=["finetune"])
api_router.include_router(flux_ultra_router.router, prefix="/flux-ultra", tags=["flux-ultra"])
api_router.include_router(upscale_router.router, tags=["upscale"])
api_router.include_router(video_router.router, tags=["video"])
api_router.include_router(reframe_router.router, tags=["reframe"])
api_router.include_router(refine_router.router, tags=["refine"])

# Include the main api_router into the app with a global prefix
app.include_router(api_router, prefix="/api/v1")

if __name__ == "__main__" or (
    hasattr(sys, "argv") and sys.argv[0].endswith("aige-backend.aige_microservice")
):
    logger.info("AIGE Microservice starting...")
    uvicorn.run("aige-backend.aige_microservice:app", host="0.0.0.0", port=8000, factory=False)
