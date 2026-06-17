from minio import Minio
from app.core.config import settings
from datetime import timedelta
import io


class StorageProvider:
    def __init__(self):
        endpoint_host = (
            settings.MINIO_ENDPOINT
            .replace("http://", "")
            .replace("https://", "")
        )

        self.client = Minio(
            endpoint_host,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_ENDPOINT.startswith("https"),
        )
        self._bucket_ready = False

    def _ensure_bucket(self):
        if self._bucket_ready:
            return
        if not self.client.bucket_exists(settings.MINIO_BUCKET):
            self.client.make_bucket(settings.MINIO_BUCKET)
        self._bucket_ready = True

    def upload_file(
        self,
        file_data: bytes,
        file_name: str,
        content_type: str,
        original_filename: str | None = None,
    ):
        self._ensure_bucket()
        file_io = io.BytesIO(file_data)
        metadata = {}

        if original_filename:
            metadata["x-amz-meta-original-filename"] = original_filename

        self.client.put_object(
            settings.MINIO_BUCKET,
            file_name,
            file_io,
            len(file_data),
            content_type=content_type,
            metadata=metadata if metadata else None,
        )

        return f"/api/chat/files/{file_name}"

    def get_presigned_url(self, object_name: str):
        self._ensure_bucket()
        return self.client.get_presigned_url(
            "GET",
            settings.MINIO_BUCKET,
            object_name,
            expires=timedelta(hours=24),
        )

    def get_file(self, object_name: str):
        self._ensure_bucket()
        response = self.client.get_object(
            settings.MINIO_BUCKET,
            object_name,
        )
        return response

    def get_file_metadata(self, object_name: str):
        self._ensure_bucket()
        stat = self.client.stat_object(
            settings.MINIO_BUCKET,
            object_name,
        )
        return {
            "size": stat.size,
            "content_type": stat.content_type,
            "original_filename": stat.metadata.get(
                "x-amz-meta-original-filename",
                object_name,
            ),
        }


storage = StorageProvider()
