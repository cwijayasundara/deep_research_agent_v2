"""Tests for ResearchOrchestrator with mocked agent."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.service.research_orchestrator import ResearchOrchestrator
from backend.service.report_parser import ReportParser
from backend.types.enums import ResearchStatus


MOCK_MARKDOWN = """## TL;DR
- AI industry update

## Global Viral Events
### Test Event
- **Category**: research
- **Impact Rating**: 7
- **Confidence**: high
- **Source**: https://test.com
- **Summary**: A test event summary.

## Strategic Deep Dives
### Test Dive
- **Priority**: HIGH
- **Summary**: Test dive summary.
- **Key Findings**
- Finding 1

## Completeness Audit
- **Verified Signals**: 3
- **Sources Checked**: 5
- **Confidence Score**: 0.7
- **Gaps**: none
"""


@pytest.fixture
def mock_runner():
    runner = MagicMock()
    runner.run_research = AsyncMock(return_value=MOCK_MARKDOWN)
    return runner


@pytest.fixture
def mock_repo():
    repo = MagicMock()
    repo.save_report = AsyncMock()
    return repo


@pytest.fixture
def orchestrator(mock_runner, mock_repo):
    return ResearchOrchestrator(
        runner=mock_runner,
        parser=ReportParser(),
        repo=mock_repo,
    )


class TestRunDailyResearch:
    async def test_successful_run(self, orchestrator, mock_repo):
        report = await orchestrator.run_daily_research("2026-03-01")
        assert report.report_id == "rpt-2026-03-01"
        assert report.result.status == ResearchStatus.COMPLETED
        assert len(report.result.viral_events) == 1
        assert report.result.viral_events[0].summary == "A test event summary."
        assert len(report.result.deep_dives) == 1
        assert report.result.completeness_audit is not None
        mock_repo.save_report.assert_awaited_once()

    async def test_failed_run(self, mock_repo):
        runner = MagicMock()
        runner.run_research = AsyncMock(side_effect=RuntimeError("boom"))
        orch = ResearchOrchestrator(runner, ReportParser(), mock_repo)
        report = await orch.run_daily_research("2026-03-01")
        assert report.result.status == ResearchStatus.FAILED
        assert "boom" in report.result.error_message
