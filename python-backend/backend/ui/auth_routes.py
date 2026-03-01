"""Authentication routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException

from backend.runtime.dependencies import get_auth_service
from backend.service.auth_service import AuthService
from backend.types.errors import AuthError
from backend.types.requests import AuthRequest, AuthToken

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=AuthToken)
async def login(
    request: AuthRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthToken:
    try:
        return auth_service.authenticate(request.password)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
