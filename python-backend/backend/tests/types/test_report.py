"""Tests for report types -- v2 has single result field, no engine field."""

from datetime import datetime, timezone

from backend.types.enums import ResearchStatus
from backend.types.report import EngineResult, ResearchReport


class TestEngineResult:
    def test_no_engine_field(self):
        result = EngineResult(
            status=ResearchStatus.COMPLETED,
            raw_markdown="# Test",
            tldr="summary",
            viral_events=[],
            deep_dives=[],
            completeness_audit=None,
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
            duration_seconds=1.5,
            error_message=None,
        )
        assert not hasattr(result, "engine")
        assert result.status == ResearchStatus.COMPLETED


class TestResearchReport:
    def test_single_result_field(self):
        now = datetime.now(timezone.utc)
        report = ResearchReport(
            report_id="rpt-2026-03-01",
            run_date=now,
            result=None,
            created_at=now,
        )
        assert report.result is None
        assert not hasattr(report, "gemini_result")
        assert not hasattr(report, "langchain_result")

    def test_serialization_roundtrip(self):
        now = datetime.now(timezone.utc)
        report = ResearchReport(
            report_id="rpt-2026-03-01",
            run_date=now,
            result=None,
            created_at=now,
        )
        json_str = report.model_dump_json()
        restored = ResearchReport.model_validate_json(json_str)
        assert restored.report_id == report.report_id
