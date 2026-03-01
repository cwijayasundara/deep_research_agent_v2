"""Tests for ReportParser -- including summary field."""

import pytest

from backend.service.report_parser import ReportParser
from backend.types.enums import ConfidenceLevel, EventCategory


SAMPLE_MARKDOWN = """## TL;DR
- Bullet one about major developments
- Bullet two about funding

## Global Viral Events
### OpenAI Launches GPT-5
- **Category**: product_launch
- **Impact Rating**: 9
- **Confidence**: high
- **Source**: https://example.com/gpt5
- **Summary**: OpenAI released GPT-5 with major improvements in reasoning.

### Anthropic Raises $5B
- **Category**: funding
- **Impact Rating**: 8
- **Confidence**: medium
- **Source**: https://example.com/anthropic
- **Summary**: Anthropic closed a $5B Series D round led by major investors.

## Strategic Deep Dives
### The GPT-5 Architecture
- **Priority**: HIGH
- **Summary**: GPT-5 represents a paradigm shift with new architecture.
- **Key Findings**
- Native multimodal processing
- 10x context window increase
- Improved reasoning benchmarks

## Completeness Audit
- **Verified Signals**: 8
- **Sources Checked**: 15
- **Confidence Score**: 0.85
- **Gaps**: robotics, edge computing
"""


@pytest.fixture
def parser():
    return ReportParser()


class TestParseTldr:
    def test_extracts_tldr(self, parser):
        tldr = parser.parse_tldr(SAMPLE_MARKDOWN)
        assert "Bullet one" in tldr
        assert "Bullet two" in tldr

    def test_empty_when_missing(self, parser):
        assert parser.parse_tldr("no sections here") == ""


class TestParseViralEvents:
    def test_parses_events_with_summary(self, parser):
        events = parser.parse_viral_events(SAMPLE_MARKDOWN)
        assert len(events) == 2

        first = events[0]
        assert first.headline == "OpenAI Launches GPT-5"
        assert first.category == EventCategory.PRODUCT_LAUNCH
        assert first.impact_rating == 9
        assert first.confidence == ConfidenceLevel.HIGH
        assert first.source == "https://example.com/gpt5"
        assert "GPT-5" in first.summary

    def test_summary_field_present(self, parser):
        events = parser.parse_viral_events(SAMPLE_MARKDOWN)
        for event in events:
            assert hasattr(event, "summary")

    def test_empty_when_no_section(self, parser):
        assert parser.parse_viral_events("# Nothing") == []


class TestParseDeepDives:
    def test_parses_dives(self, parser):
        dives = parser.parse_deep_dives(SAMPLE_MARKDOWN)
        assert len(dives) == 1
        assert dives[0].title == "The GPT-5 Architecture"
        assert dives[0].priority == "HIGH"
        assert len(dives[0].key_findings) == 3


class TestParseCompletenessAudit:
    def test_parses_audit(self, parser):
        audit = parser.parse_completeness_audit(SAMPLE_MARKDOWN)
        assert audit is not None
        assert audit.verified_signals == 8
        assert audit.sources_checked == 15
        assert audit.confidence_score == 0.85
        assert audit.gaps == ["robotics", "edge computing"]

    def test_none_when_missing(self, parser):
        assert parser.parse_completeness_audit("# Nothing") is None
