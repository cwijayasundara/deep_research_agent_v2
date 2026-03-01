"""Orchestrates the full research pipeline: agent -> parse -> store."""

import logging
import time
from datetime import datetime, timezone

from backend.repo.sqlite_repo import SqliteRepo
from backend.service.agent_runner import AgentRunner
from backend.service.report_parser import ReportParser
from backend.types.enums import ResearchStatus
from backend.types.report import EngineResult, ResearchReport

logger = logging.getLogger(__name__)


class ResearchOrchestrator:
    def __init__(
        self,
        runner: AgentRunner,
        parser: ReportParser,
        repo: SqliteRepo,
    ) -> None:
        self._runner = runner
        self._parser = parser
        self._repo = repo

    async def run_daily_research(self, date: str) -> ResearchReport:
        report_id = f"rpt-{date}"
        started_at = datetime.now(timezone.utc)
        wall_start = time.monotonic()

        logger.info(
            "Starting research pipeline report_id=%s date=%s",
            report_id,
            date,
        )

        try:
            raw_markdown = await self._runner.run_research(date)
            agent_duration = time.monotonic() - wall_start
            logger.info(
                "Agent completed report_id=%s agent_duration=%.1fs output_len=%d, parsing...",
                report_id,
                agent_duration,
                len(raw_markdown),
            )

            completed_at = datetime.now(timezone.utc)
            tldr = self._parser.parse_tldr(raw_markdown)
            viral_events = self._parser.parse_viral_events(raw_markdown)
            deep_dives = self._parser.parse_deep_dives(raw_markdown)
            completeness_audit = self._parser.parse_completeness_audit(
                raw_markdown
            )

            total_duration = time.monotonic() - wall_start
            logger.info(
                "Parsing complete report_id=%s events=%d dives=%d has_tldr=%s duration=%.1fs",
                report_id,
                len(viral_events),
                len(deep_dives),
                tldr is not None,
                total_duration,
            )

            result = EngineResult(
                status=ResearchStatus.COMPLETED,
                raw_markdown=raw_markdown,
                tldr=tldr,
                viral_events=viral_events,
                deep_dives=deep_dives,
                completeness_audit=completeness_audit,
                started_at=started_at,
                completed_at=completed_at,
                duration_seconds=(
                    completed_at - started_at
                ).total_seconds(),
                error_message=None,
            )
        except Exception as exc:
            duration = time.monotonic() - wall_start
            logger.exception(
                "Research pipeline FAILED report_id=%s duration=%.1fs error=%s",
                report_id,
                duration,
                exc,
            )
            completed_at = datetime.now(timezone.utc)
            result = EngineResult(
                status=ResearchStatus.FAILED,
                raw_markdown="",
                tldr=None,
                viral_events=[],
                deep_dives=[],
                completeness_audit=None,
                started_at=started_at,
                completed_at=completed_at,
                duration_seconds=(
                    completed_at - started_at
                ).total_seconds(),
                error_message=str(exc),
            )

        report = ResearchReport(
            report_id=report_id,
            run_date=started_at,
            result=result,
            created_at=started_at,
        )
        await self._repo.save_report(report)
        logger.info(
            "Research pipeline complete report_id=%s status=%s duration=%.1fs",
            report_id,
            result.status.value,
            time.monotonic() - wall_start,
        )
        return report
