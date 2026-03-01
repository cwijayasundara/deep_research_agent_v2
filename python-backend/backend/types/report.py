"""Pydantic models for engine results and research reports."""

from datetime import datetime

from pydantic import BaseModel

from backend.types.enums import ResearchStatus
from backend.types.events import CompletenessAudit, DeepDive, ViralEvent


class EngineResult(BaseModel):
    status: ResearchStatus
    raw_markdown: str
    tldr: str | None
    viral_events: list[ViralEvent]
    deep_dives: list[DeepDive]
    completeness_audit: CompletenessAudit | None
    started_at: datetime
    completed_at: datetime
    duration_seconds: float
    error_message: str | None


class ResearchReport(BaseModel):
    report_id: str
    run_date: datetime
    result: EngineResult | None
    created_at: datetime
