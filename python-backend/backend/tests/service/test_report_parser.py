"""Tests for ReportParser -- v4.0 format."""

import pytest

from backend.service.report_parser import ReportParser
from backend.types.enums import ConfidenceLevel, EventCategory, WhyIncludedTag


SAMPLE_MARKDOWN_V4 = """## TL;DR
- Major model launches dominated the week
- Market moves reflect growing AI investment

## Global Viral Events
### 1. OpenAI Launches GPT-5
- **Category**: model
- **Country/Region**: US
- **Confidence**: high
- **Why Included**: A(Market reaction), C(Workflow shift)
- **Revenue Impact**: Could expand OpenAI's ARR by $2B within 12 months.
- **What Changed**
  - GPT-5 released with 1M token context window
  - API pricing reduced 40%
- **Proof Pack**: https://example.com/gpt5 → https://reuters.com/gpt5

### 2. Anthropic Raises $5B Series D
- **Category**: market
- **Country/Region**: US
- **Confidence**: medium
- **Why Included**: A(Market reaction), F(Revenue-pool threat)
- **Revenue Impact**: Validates $60B valuation, pressures competitors.
- **What Changed**
  - Closed largest AI funding round of 2026
  - New investors include sovereign wealth funds
- **Proof Pack**: https://example.com/anthropic → https://ft.com/anthropic

## Strategic Deep Dives

### OpenAI Launches GPT-5

#### What Happened
OpenAI released GPT-5 with a 1M token context window and native multimodal capabilities.

#### Why It Matters Mechanically
This shifts the competitive landscape by commoditizing features that were previously premium.

#### Second-Order Implications
Enterprise customers may consolidate vendors, reducing demand for specialized AI tools.

#### What to Watch Next Week
Watch for benchmark comparisons and enterprise adoption announcements.

### Anthropic Raises $5B Series D

#### What Happened
Anthropic closed a $5B Series D led by sovereign wealth funds and tech investors.

#### Why It Matters Mechanically
The capital injection allows Anthropic to scale compute and compete on model size.

#### Second-Order Implications
Other AI labs may face pressure to raise at compressed timelines or face talent drain.

#### What to Watch Next Week
Monitor how competitors respond with their own funding or partnership announcements.

## Completeness Audit
- **Verified Signals**: 12
- **Sources Checked**: 25
- **Confidence Score**: 0.9
- **Gaps**: robotics, edge computing
- **Reuters Articles Reviewed**
  - Reuters: OpenAI launches next-gen model
  - Reuters: Anthropic closes massive funding round
- **Major Stock Moves**
  - MSFT: +3.2% on OpenAI partnership expansion
  - GOOG: -1.5% on competitive pressure
- **Vendor Coverage by Region**
  - US: OpenAI, Anthropic, Meta AI, xAI
  - China: Baidu, DeepSeek, ByteDance
"""

# Backward compat: v3 format sample
SAMPLE_MARKDOWN_V3 = """## TL;DR
- Bullet one about major developments
- Bullet two about funding

## Global Viral Events
### OpenAI Launches GPT-5
- **Category**: product_launch
- **Impact Rating**: 9
- **Confidence**: high
- **Source**: https://example.com/gpt5
- **Summary**: OpenAI released GPT-5 with major improvements in reasoning.

## Strategic Deep Dives
### The GPT-5 Architecture
- **Priority**: HIGH
- **Summary**: GPT-5 represents a paradigm shift with new architecture.
- **Key Findings**
- Native multimodal processing
- 10x context window increase

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
        tldr = parser.parse_tldr(SAMPLE_MARKDOWN_V4)
        assert "Major model launches" in tldr

    def test_empty_when_missing(self, parser):
        assert parser.parse_tldr("no sections here") == ""


class TestParseViralEvents:
    def test_parses_v4_events(self, parser):
        events = parser.parse_viral_events(SAMPLE_MARKDOWN_V4)
        assert len(events) == 2

        first = events[0]
        assert first.headline == "OpenAI Launches GPT-5"
        assert first.rank == 1
        assert first.category == EventCategory.MODEL
        assert first.confidence == ConfidenceLevel.HIGH
        assert first.country_region == "US"
        assert WhyIncludedTag.A in first.why_included
        assert WhyIncludedTag.C in first.why_included
        assert "ARR" in first.revenue_impact
        assert len(first.what_changed) == 2
        assert "→" in first.proof_pack

    def test_second_event(self, parser):
        events = parser.parse_viral_events(SAMPLE_MARKDOWN_V4)
        second = events[1]
        assert second.rank == 2
        assert second.category == EventCategory.MARKET
        assert second.confidence == ConfidenceLevel.MEDIUM

    def test_backward_compat_v3(self, parser):
        events = parser.parse_viral_events(SAMPLE_MARKDOWN_V3)
        assert len(events) == 1
        first = events[0]
        assert first.headline == "OpenAI Launches GPT-5"
        assert first.category == EventCategory.PRODUCT_LAUNCH
        assert first.impact_rating == 9
        assert first.source == "https://example.com/gpt5"
        assert "GPT-5" in (first.summary or "")

    def test_empty_when_no_section(self, parser):
        assert parser.parse_viral_events("# Nothing") == []


class TestParseDeepDives:
    def test_parses_v4_dives(self, parser):
        dives = parser.parse_deep_dives(SAMPLE_MARKDOWN_V4)
        assert len(dives) == 2

        first = dives[0]
        assert first.title == "OpenAI Launches GPT-5"
        assert "GPT-5" in first.what_happened
        assert "competitive landscape" in first.why_it_matters
        assert "consolidate" in first.second_order_implications
        assert "benchmark" in first.what_to_watch

    def test_backward_compat_v3(self, parser):
        dives = parser.parse_deep_dives(SAMPLE_MARKDOWN_V3)
        assert len(dives) == 1
        first = dives[0]
        assert first.title == "The GPT-5 Architecture"
        assert first.priority == "HIGH"
        assert "paradigm shift" in (first.summary or "")
        assert first.key_findings is not None
        assert len(first.key_findings) == 2


class TestParseCompletenessAudit:
    def test_parses_v4_audit(self, parser):
        audit = parser.parse_completeness_audit(SAMPLE_MARKDOWN_V4)
        assert audit is not None
        assert audit.verified_signals == 12
        assert audit.sources_checked == 25
        assert audit.confidence_score == 0.9
        assert audit.gaps == ["robotics", "edge computing"]
        assert len(audit.reuters_articles) == 2
        assert len(audit.major_stock_moves) == 2
        assert len(audit.vendor_coverage) == 2

    def test_backward_compat_v3(self, parser):
        audit = parser.parse_completeness_audit(SAMPLE_MARKDOWN_V3)
        assert audit is not None
        assert audit.verified_signals == 8
        assert audit.sources_checked == 15
        assert audit.confidence_score == 0.85
        assert audit.gaps == ["robotics", "edge computing"]
        assert audit.reuters_articles == []
        assert audit.major_stock_moves == []
        assert audit.vendor_coverage == []

    def test_none_when_missing(self, parser):
        assert parser.parse_completeness_audit("# Nothing") is None
