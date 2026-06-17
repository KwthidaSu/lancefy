import logging

from minio import Minio
from minio.error import S3Error

from app.core.config import settings

logger = logging.getLogger(__name__)


def create_minio_client() -> Minio:
    if not settings.MINIO_ENDPOINT:
        raise ValueError("MINIO_ENDPOINT is not set")

    endpoint = settings.MINIO_ENDPOINT
    if "://" in endpoint:
        endpoint = endpoint.split("://", 1)[1]

    return Minio(
        endpoint,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_ENDPOINT.startswith("https"),
    )


minio_client = create_minio_client()

BUCKET_NAME = settings.MINIO_BUCKET


def ensure_bucket():
    try:
        if not minio_client.bucket_exists(BUCKET_NAME):
            minio_client.make_bucket(BUCKET_NAME)
            logger.info("Bucket created: %s", BUCKET_NAME)
        else:
            logger.info("Bucket exists: %s", BUCKET_NAME)

        import json
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{BUCKET_NAME}/*"],
                }
            ],
        }
        minio_client.set_bucket_policy(BUCKET_NAME, json.dumps(policy))
        logger.info("Bucket policy set to public-read: %s", BUCKET_NAME)
    except S3Error as exc:
        logger.exception("MinIO error while ensuring bucket")
        raise RuntimeError("Unable to initialize storage bucket") from exc
    except Exception as exc:
        logger.exception("Unexpected error while ensuring bucket")
        raise RuntimeError("Unable to initialize storage bucket") from exc


def upload_file(
    file_path: str,
    object_name: str,
    content_type: str = "application/octet-stream",
):
    try:
        minio_client.fput_object(
            BUCKET_NAME,
            object_name,
            file_path,
            content_type=content_type,
        )
        return f"{settings.MINIO_PUBLIC_URL}/{BUCKET_NAME}/{object_name}"
    except S3Error as exc:
        raise RuntimeError("Upload failed") from exc


def upload_bytes(
    data: bytes,
    object_name: str,
    content_type: str = "application/octet-stream",
):
    from io import BytesIO

    try:
        minio_client.put_object(
            BUCKET_NAME,
            object_name,
            BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return f"{settings.MINIO_PUBLIC_URL}/{BUCKET_NAME}/{object_name}"
    except S3Error as exc:
        raise RuntimeError("Upload failed") from exc


def delete_file(object_name: str):
    try:
        minio_client.remove_object(BUCKET_NAME, object_name)
    except S3Error as exc:
        raise RuntimeError("Delete failed") from exc
