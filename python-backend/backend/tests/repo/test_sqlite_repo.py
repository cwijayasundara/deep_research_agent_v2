"""Tests for SqliteRepo."""

import pytest

from datetime import datetime, timezone

from backend.repo.sqlite_repo import SqliteRepo
from backend.types.enums import ResearchStatus
from backend.types.report import EngineResult, ResearchReport


@pytest.fixture
async def repo(tmp_path):
    db_path = str(tmp_path / "test.db")
    repo = SqliteRepo(db_path=db_path)
    await repo.init_db()
    return repo


def _make_report(report_id: str = "rpt-2026-03-01") -> ResearchReport:
    now = datetime.now(timezone.utc)
    return ResearchReport(
        report_id=report_id,
        run_date=now,
        result=EngineResult(
            status=ResearchStatus.COMPLETED,
            raw_markdown="# Test",
            tldr="summary",
            viral_events=[],
            deep_dives=[],
            completeness_audit=None,
            started_at=now,
            completed_at=now,
            duration_seconds=1.0,
            error_message=None,
        ),
        created_at=now,
    )


class TestSaveAndGet:
    async def test_save_and_retrieve(self, repo):
        report = _make_report()
        await repo.save_report(report)
        loaded = await repo.get_report("rpt-2026-03-01")
        assert loaded is not None
        assert loaded.report_id == "rpt-2026-03-01"

    async def test_get_nonexistent_returns_none(self, repo):
        result = await repo.get_report("nonexistent")
        assert result is None

    async def test_upsert_overwrites(self, repo):
        report1 = _make_report()
        await repo.save_report(report1)
        report2 = _make_report()
        report2.result.tldr = "updated"
        await repo.save_report(report2)
        loaded = await repo.get_report("rpt-2026-03-01")
        assert loaded.result.tldr == "updated"


class TestListReports:
    async def test_list_returns_all(self, repo):
        await repo.save_report(_make_report("rpt-2026-03-01"))
        await repo.save_report(_make_report("rpt-2026-03-02"))
        reports = await repo.list_reports()
        assert len(reports) == 2

    async def test_list_respects_limit(self, repo):
        for i in range(5):
            await repo.save_report(_make_report(f"rpt-2026-03-0{i+1}"))
        reports = await repo.list_reports(limit=3)
        assert len(reports) == 3
