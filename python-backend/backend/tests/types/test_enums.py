"""Tests for type enumerations."""

from backend.types.enums import (
    ConfidenceLevel,
    EventCategory,
    ResearchStatus,
    WhyIncludedTag,
)


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
    def test_new_v4_values(self):
        assert EventCategory.MODEL.value == "model"
        assert EventCategory.INFRA.value == "infra"
        assert EventCategory.MARKET.value == "market"
        assert EventCategory.REGULATION.value == "regulation"
        assert EventCategory.MOAT_ATTACK.value == "moat_attack"

    def test_backward_compat_values(self):
        assert EventCategory.PRODUCT_LAUNCH.value == "product_launch"
        assert EventCategory.FUNDING.value == "funding"
        assert EventCategory.PARTNERSHIP.value == "partnership"
        assert EventCategory.RESEARCH.value == "research"
        assert EventCategory.OPEN_SOURCE.value == "open_source"


class TestWhyIncludedTag:
    def test_values(self):
        assert WhyIncludedTag.A.value == "A"
        assert WhyIncludedTag.B.value == "B"
        assert WhyIncludedTag.C.value == "C"
        assert WhyIncludedTag.D.value == "D"
        assert WhyIncludedTag.E.value == "E"
        assert WhyIncludedTag.F.value == "F"
        assert WhyIncludedTag.G.value == "G"
