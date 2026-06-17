import importlib
import os


REQUIRED_TEST_ENV = {
    "DATABASE_URL": "postgresql://user:pass@localhost:5432/test_db",
    "KEYCLOAK_URL": "http://localhost:8081",
    "KEYCLOAK_REALM": "app",
    "KEYCLOAK_CLIENT_ID": "backend",
    "KEYCLOAK_CLIENT_SECRET": "secret",
    "MINIO_ENDPOINT": "http://localhost:9000",
    "MINIO_ACCESS_KEY": "minio",
    "MINIO_SECRET_KEY": "minio-secret",
    "MINIO_BUCKET": "app-files",
    "MINIO_PUBLIC_URL": "http://localhost:9000",
}


def apply_test_env(**overrides) -> dict[str, str | None]:
    backup = {key: os.environ.get(key) for key in {**REQUIRED_TEST_ENV, **overrides}}
    for key, value in REQUIRED_TEST_ENV.items():
        os.environ[key] = value
    for key, value in overrides.items():
        os.environ[key] = value
    return backup


def restore_env(backup: dict[str, str | None]) -> None:
    for key, value in backup.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value


def reload_modules(*module_names: str):
    modules = []
    for name in module_names:
        module = importlib.import_module(name)
        modules.append(importlib.reload(module))
    return modules
