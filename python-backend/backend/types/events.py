"""Pydantic models for viral events, deep dives, and audits."""

from pydantic import BaseModel, Field

from backend.types.enums import ConfidenceLevel, EventCategory, WhyIncludedTag


class ViralEvent(BaseModel):
    headline: str
    category: EventCategory
    confidence: ConfidenceLevel
    rank: int = Field(default=0)
    country_region: str = Field(default="")
    why_included: list[WhyIncludedTag] = Field(default_factory=list)
    revenue_impact: str = Field(default="")
    what_changed: list[str] = Field(default_factory=list)
    proof_pack: str = Field(default="")
    # Backward compat: old fields kept as optional
    impact_rating: int | None = Field(default=None)
    source: str | None = Field(default=None)
    summary: str | None = Field(default=None)


class DeepDive(BaseModel):
    title: str
    what_happened: str = Field(default="")
    why_it_matters: str = Field(default="")
    second_order_implications: str = Field(default="")
    what_to_watch: str = Field(default="")
    # Backward compat: old fields kept as optional
    priority: str | None = Field(default=None)
    summary: str | None = Field(default=None)
    key_findings: list[str] | None = Field(default=None)


class CompletenessAudit(BaseModel):
    verified_signals: int
    sources_checked: int
    confidence_score: float = Field(ge=0.0, le=1.0)
    gaps: list[str]
    reuters_articles: list[str] = Field(default_factory=list)
    major_stock_moves: list[str] = Field(default_factory=list)
    vendor_coverage: list[str] = Field(default_factory=list)
