"""Tests for AuthService."""

import pytest

from backend.service.auth_service import AuthService
from backend.types.errors import AuthError


@pytest.fixture
def auth_service():
    return AuthService(
        shared_password="test-pass",
        jwt_secret="test-secret",
        jwt_algorithm="HS256",
        jwt_expire_hours=1,
    )


class TestAuthenticate:
    def test_valid_password(self, auth_service):
        token = auth_service.authenticate("test-pass")
        assert token.access_token
        assert token.token_type == "bearer"

    def test_invalid_password(self, auth_service):
        with pytest.raises(AuthError, match="Invalid password"):
            auth_service.authenticate("wrong")


class TestVerifyToken:
    def test_valid_token(self, auth_service):
        token = auth_service.authenticate("test-pass")
        payload = auth_service.verify_token(token.access_token)
        assert payload["sub"] == "user"

    def test_invalid_token(self, auth_service):
        with pytest.raises(AuthError, match="Invalid token"):
            auth_service.verify_token("bad.token.here")
