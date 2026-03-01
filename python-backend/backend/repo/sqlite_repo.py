"""SQLite repository for research reports using aiosqlite."""

import logging
from pathlib import Path

import aiosqlite

from backend.types.errors import DatabaseError
from backend.types.report import ResearchReport

logger = logging.getLogger(__name__)


class SqliteRepo:
    def __init__(self, db_path: str = "data/reports.db") -> None:
        self._db_path = db_path

    async def init_db(self) -> None:
        Path(self._db_path).parent.mkdir(parents=True, exist_ok=True)
        try:
            async with aiosqlite.connect(self._db_path) as db:
                await db.execute(
                    """CREATE TABLE IF NOT EXISTS reports (
                        report_id TEXT PRIMARY KEY,
                        run_date TEXT NOT NULL,
                        data TEXT NOT NULL
                    )"""
                )
                await db.commit()

                # Mark orphaned "running" reports as "failed" (e.g. from a crash/restart).
                updated = await db.execute(
                    """UPDATE reports
                       SET data = json_set(data, '$.result.status', 'failed',
                                           '$.result.error_message', 'Server restarted while research was in progress')
                       WHERE json_extract(data, '$.result.status') = 'running'"""
                )
                if updated.rowcount:
                    await db.commit()
                    logger.warning(
                        "Marked %d orphaned running report(s) as failed", updated.rowcount
                    )
            logger.info("SQLite database initialized at %s", self._db_path)
        except aiosqlite.Error as exc:
            raise DatabaseError(f"Failed to init DB: {exc}") from exc

    async def save_report(self, report: ResearchReport) -> None:
        data = report.model_dump_json()
        try:
            async with aiosqlite.connect(self._db_path) as db:
                await db.execute(
                    "INSERT OR REPLACE INTO reports (report_id, run_date, data) "
                    "VALUES (?, ?, ?)",
                    (report.report_id, report.run_date.isoformat(), data),
                )
                await db.commit()
            logger.info("Saved report %s", report.report_id)
        except aiosqlite.Error as exc:
            raise DatabaseError(f"Failed to save report: {exc}") from exc

    async def get_report(self, report_id: str) -> ResearchReport | None:
        try:
            async with aiosqlite.connect(self._db_path) as db:
                cursor = await db.execute(
                    "SELECT data FROM reports WHERE report_id = ?",
                    (report_id,),
                )
                row = await cursor.fetchone()
            if row is None:
                return None
            return ResearchReport.model_validate_json(row[0])
        except aiosqlite.Error as exc:
            raise DatabaseError(f"Failed to get report: {exc}") from exc

    async def list_reports(self, limit: int = 20) -> list[ResearchReport]:
        try:
            async with aiosqlite.connect(self._db_path) as db:
                cursor = await db.execute(
                    "SELECT data FROM reports ORDER BY run_date DESC LIMIT ?",
                    (limit,),
                )
                rows = await cursor.fetchall()
            return [ResearchReport.model_validate_json(row[0]) for row in rows]
        except aiosqlite.Error as exc:
            raise DatabaseError(f"Failed to list reports: {exc}") from exc
