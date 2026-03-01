"""Tests for health endpoint."""

import pytest
from fastapi.testclient import TestClient

from backend.ui.app_factory import create_app


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


class TestHealthCheck:
    def test_returns_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}
