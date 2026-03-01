"""Tests for event types -- v4.0 fields."""

from backend.types.enums import ConfidenceLevel, EventCategory, WhyIncludedTag
from backend.types.events import CompletenessAudit, DeepDive, ViralEvent


class TestViralEvent:
    def test_v4_fields(self):
        event = ViralEvent(
            headline="Test Event",
            category=EventCategory.MODEL,
            confidence=ConfidenceLevel.HIGH,
            rank=1,
            country_region="US",
            why_included=[WhyIncludedTag.A, WhyIncludedTag.C],
            revenue_impact="Could shift $10B TAM",
            what_changed=["New model released", "API pricing cut"],
            proof_pack="https://example.com/primary → https://example.com/secondary",
        )
        assert event.rank == 1
        assert event.country_region == "US"
        assert len(event.why_included) == 2
        assert event.revenue_impact == "Could shift $10B TAM"
        assert len(event.what_changed) == 2
        assert "→" in event.proof_pack

    def test_backward_compat_defaults(self):
        event = ViralEvent(
            headline="Old Event",
            category=EventCategory.RESEARCH,
            confidence=ConfidenceLevel.MEDIUM,
        )
        assert event.rank == 0
        assert event.country_region == ""
        assert event.why_included == []
        assert event.impact_rating is None
        assert event.source is None
        assert event.summary is None

    def test_old_fields_still_work(self):
        event = ViralEvent(
            headline="Legacy Event",
            category=EventCategory.FUNDING,
            confidence=ConfidenceLevel.LOW,
            impact_rating=7,
            source="https://example.com",
            summary="A test summary.",
        )
        assert event.impact_rating == 7
        assert event.source == "https://example.com"
        assert event.summary == "A test summary."


class TestDeepDive:
    def test_v4_four_sections(self):
        dive = DeepDive(
            title="Test Dive",
            what_happened="Something happened",
            why_it_matters="It matters because...",
            second_order_implications="Cascading effects...",
            what_to_watch="Watch for...",
        )
        assert dive.what_happened == "Something happened"
        assert dive.why_it_matters == "It matters because..."
        assert dive.second_order_implications == "Cascading effects..."
        assert dive.what_to_watch == "Watch for..."

    def test_backward_compat_defaults(self):
        dive = DeepDive(title="Minimal")
        assert dive.what_happened == ""
        assert dive.priority is None
        assert dive.summary is None
        assert dive.key_findings is None

    def test_old_fields_still_work(self):
        dive = DeepDive(
            title="Legacy Dive",
            priority="HIGH",
            summary="Summary text",
            key_findings=["f1", "f2"],
        )
        assert dive.priority == "HIGH"
        assert len(dive.key_findings) == 2


class TestCompletenessAudit:
    def test_v4_new_fields(self):
        audit = CompletenessAudit(
            verified_signals=12,
            sources_checked=25,
            confidence_score=0.9,
            gaps=["robotics"],
            reuters_articles=["Article 1", "Article 2"],
            major_stock_moves=["NVDA +5%"],
            vendor_coverage=["US: OpenAI, Anthropic"],
        )
        assert len(audit.reuters_articles) == 2
        assert len(audit.major_stock_moves) == 1
        assert len(audit.vendor_coverage) == 1

    def test_confidence_score_range(self):
        audit = CompletenessAudit(
            verified_signals=5,
            sources_checked=10,
            confidence_score=0.85,
            gaps=["gap1"],
        )
        assert 0.0 <= audit.confidence_score <= 1.0

    def test_new_fields_default_empty(self):
        audit = CompletenessAudit(
            verified_signals=5,
            sources_checked=10,
            confidence_score=0.5,
            gaps=[],
        )
        assert audit.reuters_articles == []
        assert audit.major_stock_moves == []
        assert audit.vendor_coverage == []
