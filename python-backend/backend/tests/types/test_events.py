"""Tests for event types -- verifies ViralEvent includes summary."""

from backend.types.enums import ConfidenceLevel, EventCategory
from backend.types.events import CompletenessAudit, DeepDive, ViralEvent


class TestViralEvent:
    def test_includes_summary_field(self):
        event = ViralEvent(
            headline="Test Event",
            category=EventCategory.RESEARCH,
            impact_rating=7,
            confidence=ConfidenceLevel.HIGH,
            source="https://example.com",
            summary="A test summary of the event.",
        )
        assert event.summary == "A test summary of the event."

    def test_impact_rating_bounds(self):
        event = ViralEvent(
            headline="Test",
            category=EventCategory.FUNDING,
            impact_rating=1,
            confidence=ConfidenceLevel.LOW,
            source="src",
            summary="",
        )
        assert event.impact_rating == 1


class TestDeepDive:
    def test_key_findings_list(self):
        dive = DeepDive(
            title="Test Dive",
            priority="HIGH",
            summary="Summary",
            key_findings=["f1", "f2"],
        )
        assert len(dive.key_findings) == 2


class TestCompletenessAudit:
    def test_confidence_score_range(self):
        audit = CompletenessAudit(
            verified_signals=5,
            sources_checked=10,
            confidence_score=0.85,
            gaps=["gap1"],
        )
        assert 0.0 <= audit.confidence_score <= 1.0
