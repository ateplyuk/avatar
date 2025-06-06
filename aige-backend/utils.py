import httpx
import logging

logger = logging.getLogger(__name__)

async def upload_image_to_presigned_url(url: str, image_data: bytes, content_type: str):
    """
    Uploads image data to a pre-signed URL using HTTP PUT.

    Args:
        url: The pre-signed URL for uploading.
        image_data: The image data in bytes.
        content_type: The content type of the image (e.g., "image/png", "image/jpeg").
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            logger.info(f"Attempting to upload image ({len(image_data)} bytes, type: {content_type}) to {url[:100]}...") # Log only part of URL
            
            # Pre-signed URLs for S3 expect specific headers.
            # Content-Type is crucial. Content-Length is usually handled by httpx.
            # Sometimes other headers like x-amz-acl might be part of the pre-signing process,
            # but typically for a PUT to a pre-signed URL, Content-Type and the data are primary.
            headers = {
                "Content-Type": content_type
            }
            
            response = await client.put(url, content=image_data, headers=headers)
            response.raise_for_status() # Raises an exception for 4XX/5XX responses
            
            logger.info(f"Successfully uploaded image to pre-signed URL. Status: {response.status_code}")
            # Some S3 pre-signed URL PUTs return 200 OK with an empty body or an ETag header.
            # No specific data needs to be returned by this function on success.

        except httpx.HTTPStatusError as e:
            # Log detailed error information from the response
            error_message = f"Failed to upload image. Status: {e.response.status_code}. Response: {e.response.text}"
            logger.error(error_message, exc_info=True)
            # Re-raise the exception so the calling task can handle it (e.g., set task status to "error")
            raise Exception(error_message) from e 
        except Exception as e:
            # Catch any other exceptions (network issues, etc.)
            logger.error(f"An unexpected error occurred during image upload: {e}", exc_info=True)
            raise Exception(f"An unexpected error occurred during image upload: {e}") from e
