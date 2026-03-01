"""FastAPI application factory."""

import logging
import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from backend.ui.router import register_routes

logger = logging.getLogger(__name__)


def _configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("langchain").setLevel(logging.WARNING)


def create_app() -> FastAPI:
    _configure_logging()

    app = FastAPI(
        title="Deep Research Agent v2",
        description="Multi-Agent AI Intelligence Tracker API",
        version="2.0.0",
    )

    origins = os.environ.get(
        "CORS_ORIGINS", "http://localhost:3000"
    ).split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.monotonic()
        method = request.method
        path = request.url.path
        logger.info(">>> %s %s", method, path)
        response = await call_next(request)
        duration = time.monotonic() - start
        logger.info(
            "<<< %s %s status=%d duration=%.3fs",
            method,
            path,
            response.status_code,
            duration,
        )
        return response

    register_routes(app)
    logger.info("Application created successfully")
    return app
