import boto3
import uuid
from datetime import datetime, timezone
from botocore.client import Config
from fastapi import APIRouter, HTTPException

router = APIRouter()

# Конфигурация клиента
bucket_name = "teplyuk-test"
endpoint_url = "https://t3.storage.dev"
region = "auto"
expiration = 3600000  # Время действия URL в секундах (1000 час)

# Инициализация клиента S3
s3_client = boto3.client(
    's3',
    endpoint_url=endpoint_url,
    region_name=region,
    config=Config(s3={'addressing_style': 'virtual'}),
    aws_access_key_id='tid_WrWfNMUMkkcLlXKaelojGZnOjXiUccpw_exgnyEBWvJzlGqfWF',
    aws_secret_access_key='tsec_zKwoi1dlo8aUy_4KnJB4Yh7JWTM+Kxv4aaD55ZaJl8+yxnmN-yZufTR2uPLwbZ3Pja2+hu'
)

@router.get("/generate-urls")
async def generate_urls():
    try:
        # Создание уникального ключа в формате test-<timestamp>-<uuid>
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S-%fZ")
        unique_id = str(uuid.uuid4())
        object_key = f"test-{timestamp}-{unique_id}"

        # Создание URLs
        write_url = s3_client.generate_presigned_url(
            'put_object',
            Params={'Bucket': bucket_name, 'Key': object_key},
            ExpiresIn=expiration
        )
        
        read_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': object_key},
            ExpiresIn=expiration
        )

        return {
            "key": object_key,
            "writeUrl": write_url,
            "readUrl": read_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 