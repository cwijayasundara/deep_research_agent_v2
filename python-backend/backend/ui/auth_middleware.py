"""Authentication middleware for protected routes."""

import logging

from fastapi import HTTPException

from backend.service.auth_service import AuthService
from backend.types.errors import AuthError

logger = logging.getLogger(__name__)


def require_auth(
    authorization: str | None, auth_service: AuthService
) -> dict[str, str]:
    if authorization is None:
        logger.warning("Auth rejected: missing authorization header")
        raise HTTPException(status_code=401, detail="Missing authorization")

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0] != "Bearer":
        logger.warning("Auth rejected: invalid auth scheme")
        raise HTTPException(status_code=401, detail="Invalid auth scheme")

    try:
        return auth_service.verify_token(parts[1])
    except AuthError as exc:
        logger.warning("Auth rejected: invalid token - %s", exc)
        raise HTTPException(status_code=401, detail=str(exc)) from exc
