"""Request and response models for the API."""

from pydantic import BaseModel

from backend.types.report import ResearchReport


class ResearchRequest(BaseModel):
    date: str | None = None


class ReportListResponse(BaseModel):
    reports: list[ResearchReport]
    total: int


class AuthRequest(BaseModel):
    password: str


class AuthToken(BaseModel):
    access_token: str
    token_type: str
