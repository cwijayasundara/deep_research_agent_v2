"""Route registration."""

from fastapi import FastAPI

from backend.ui.auth_routes import router as auth_router
from backend.ui.health_routes import router as health_router
from backend.ui.report_routes import router as report_router


def register_routes(app: FastAPI) -> None:
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(report_router)
