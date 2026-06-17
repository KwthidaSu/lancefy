import logging
import time
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)

REQUEST_ID_HEADER = "X-Request-ID"
PROCESS_TIME_HEADER = "X-Process-Time-Ms"


def _build_headers(request: Request) -> dict[str, str]:
    request_id = getattr(request.state, "request_id", None)
    headers: dict[str, str] = {}
    if request_id:
        headers[REQUEST_ID_HEADER] = request_id
    return headers


def _json_response(request: Request, status_code: int, content: dict | list) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=jsonable_encoder(content),
        headers=_build_headers(request),
    )


def register_http_features(app: FastAPI) -> None:
    @app.middleware("http")
    async def request_context_middleware(request: Request, call_next):
        request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid4())
        request.state.request_id = request_id

        started_at = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - started_at) * 1000

        response.headers[REQUEST_ID_HEADER] = request_id
        response.headers[PROCESS_TIME_HEADER] = f"{duration_ms:.2f}"
        response.headers.setdefault("X-Content-Type-Options", "nosniff")

        logger.info(
            "HTTP request completed | method=%s path=%s status=%s request_id=%s duration_ms=%.2f",
            request.method,
            request.url.path,
            response.status_code,
            request_id,
            duration_ms,
        )
        return response

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        if exc.status_code >= status.HTTP_500_INTERNAL_SERVER_ERROR:
            logger.error(
                "HTTP exception | method=%s path=%s status=%s detail=%s request_id=%s",
                request.method,
                request.url.path,
                exc.status_code,
                exc.detail,
                getattr(request.state, "request_id", None),
            )
        return _json_response(request, exc.status_code, {"detail": exc.detail})

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(
            "Validation error | method=%s path=%s errors=%s request_id=%s",
            request.method,
            request.url.path,
            exc.errors(),
            getattr(request.state, "request_id", None),
        )
        return _json_response(
            request,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            {"detail": exc.errors()},
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
        logger.exception(
            "Database error | method=%s path=%s request_id=%s",
            request.method,
            request.url.path,
            getattr(request.state, "request_id", None),
        )
        return _json_response(
            request,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            {"detail": "Database error"},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception(
            "Unhandled exception | method=%s path=%s request_id=%s",
            request.method,
            request.url.path,
            getattr(request.state, "request_id", None),
        )
        return _json_response(
            request,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            {"detail": "Internal server error"},
        )
