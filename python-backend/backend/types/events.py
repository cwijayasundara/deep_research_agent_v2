"""Pydantic models for viral events, deep dives, and audits."""

from pydantic import BaseModel, Field

from backend.types.enums import ConfidenceLevel, EventCategory


class ViralEvent(BaseModel):
    headline: str
    category: EventCategory
    impact_rating: int = Field(ge=1, le=10)
    confidence: ConfidenceLevel
    source: str
    summary: str


class DeepDive(BaseModel):
    title: str
    priority: str
    summary: str
    key_findings: list[str]


class CompletenessAudit(BaseModel):
    verified_signals: int
    sources_checked: int
    confidence_score: float = Field(ge=0.0, le=1.0)
    gaps: list[str]
