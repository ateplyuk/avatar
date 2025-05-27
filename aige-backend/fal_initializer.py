import os
from .config import FAL_API_TOKEN
import logging

logger = logging.getLogger(__name__)

def setup_fal_key():
    """Sets the FAL_KEY environment variable from the configuration."""
    if FAL_API_TOKEN:
        os.environ["FAL_KEY"] = FAL_API_TOKEN
        logger.debug("FAL_KEY environment variable set.")
    else:
        logger.warning("FAL_API_TOKEN not found in config. FAL_KEY not set.")
