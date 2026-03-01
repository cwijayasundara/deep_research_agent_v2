"""Report API routes."""

import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException

from backend.runtime.dependencies import get_auth_service, get_orchestrator, get_repo
from backend.repo.sqlite_repo import SqliteRepo
from backend.service.auth_service import AuthService
from backend.service.research_orchestrator import ResearchOrchestrator
from backend.types.enums import ResearchStatus
from backend.types.errors import DatabaseError
from backend.types.report import EngineResult, ResearchReport
from backend.types.requests import ReportListResponse, ResearchRequest
from backend.ui.auth_middleware import require_auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _auth_dep(
    authorization: str | None = Header(None),
    auth_service: AuthService = Depends(get_auth_service),
) -> dict[str, str]:
    return require_auth(authorization, auth_service)


@router.get("/", response_model=ReportListResponse)
async def list_reports(
    _user: dict[str, str] = Depends(_auth_dep),
    repo: SqliteRepo = Depends(get_repo),
) -> ReportListResponse:
    try:
        reports = await repo.list_reports()
    except DatabaseError as exc:
        logger.error("Database error: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return ReportListResponse(reports=reports, total=len(reports))


@router.get("/{report_id}", response_model=ResearchReport)
async def get_report(
    report_id: str,
    _user: dict[str, str] = Depends(_auth_dep),
    repo: SqliteRepo = Depends(get_repo),
) -> ResearchReport:
    try:
        report = await repo.get_report(report_id)
    except DatabaseError as exc:
        logger.error("Database error: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.post("/trigger", response_model=ResearchReport)
async def trigger_research(
    request: ResearchRequest,
    _user: dict[str, str] = Depends(_auth_dep),
    orchestrator: ResearchOrchestrator = Depends(get_orchestrator),
    repo: SqliteRepo = Depends(get_repo),
) -> ResearchReport:
    date = request.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    logger.info("Research trigger requested date=%s", date)

    report_id = f"rpt-{date}"
    existing = await repo.get_report(report_id)
    if existing and existing.result:
        if existing.result.status in (ResearchStatus.COMPLETED, ResearchStatus.RUNNING):
            logger.info(
                "Reusing existing report %s (status=%s, skipping new research)",
                report_id,
                existing.result.status.value,
            )
            return existing
        logger.info(
            "Found existing report %s (status=%s, error=%s), allowing re-trigger",
            report_id,
            existing.result.status.value,
            existing.result.error_message or "none",
        )
    else:
        logger.info("No existing report found for %s, starting fresh", report_id)

    now = datetime.now(timezone.utc)
    running_report = ResearchReport(
        report_id=report_id,
        run_date=now,
        result=EngineResult(
            status=ResearchStatus.RUNNING,
            raw_markdown="",
            tldr=None,
            viral_events=[],
            deep_dives=[],
            completeness_audit=None,
            started_at=now,
            completed_at=now,
            duration_seconds=0.0,
            error_message=None,
        ),
        created_at=now,
    )
    await repo.save_report(running_report)
    logger.info(
        "Saved Running report %s, spawning background research task",
        report_id,
    )

    async def _background_research() -> None:
        logger.info("Background research task started report_id=%s", report_id)
        try:
            report = await orchestrator.run_daily_research(date)
            status = report.result.status.value if report.result else "unknown"
            logger.info(
                "Background research task completed report_id=%s final_status=%s",
                report_id,
                status,
            )
        except Exception:
            logger.exception(
                "Background research task FAILED report_id=%s", report_id
            )

    asyncio.create_task(_background_research())

    return running_report
