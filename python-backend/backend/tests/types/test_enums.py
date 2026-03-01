"""Tests for type enumerations."""

from backend.types.enums import ConfidenceLevel, EventCategory, ResearchStatus


class TestResearchStatus:
    def test_values(self):
        assert ResearchStatus.PENDING.value == "pending"
        assert ResearchStatus.RUNNING.value == "running"
        assert ResearchStatus.COMPLETED.value == "completed"
        assert ResearchStatus.FAILED.value == "failed"


class TestConfidenceLevel:
    def test_values(self):
        assert ConfidenceLevel.HIGH.value == "high"
        assert ConfidenceLevel.MEDIUM.value == "medium"
        assert ConfidenceLevel.LOW.value == "low"


class TestEventCategory:
    def test_values(self):
        assert EventCategory.PRODUCT_LAUNCH.value == "product_launch"
        assert EventCategory.FUNDING.value == "funding"
        assert EventCategory.PARTNERSHIP.value == "partnership"
        assert EventCategory.REGULATION.value == "regulation"
        assert EventCategory.RESEARCH.value == "research"
        assert EventCategory.OPEN_SOURCE.value == "open_source"
