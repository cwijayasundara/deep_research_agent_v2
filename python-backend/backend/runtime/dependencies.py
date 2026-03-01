"""FastAPI dependency injection."""

import logging
import os
from functools import lru_cache

from backend.config.settings import Settings
from backend.repo.sqlite_repo import SqliteRepo
from backend.service.auth_service import AuthService
from backend.service.agent_runner import AgentRunner
from backend.service.report_parser import ReportParser
from backend.service.research_orchestrator import ResearchOrchestrator

logger = logging.getLogger(__name__)


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    # Export API keys to env so third-party libs (TavilyClient etc.) can find them.
    os.environ.setdefault("TAVILY_API_KEY", s.tavily_api_key)
    os.environ.setdefault("OPENAI_API_KEY", s.openai_api_key)
    if s.gemini_api_key:
        os.environ.setdefault("GOOGLE_API_KEY", s.gemini_api_key)
    return s


def get_auth_service() -> AuthService:
    s = get_settings()
    return AuthService(
        shared_password=s.app_shared_password,
        jwt_secret=s.jwt_secret,
        jwt_algorithm=s.jwt_algorithm,
        jwt_expire_hours=s.jwt_expire_hours,
    )


_repo: SqliteRepo | None = None


async def get_repo() -> SqliteRepo:
    global _repo
    if _repo is None:
        _repo = SqliteRepo()
        await _repo.init_db()
    return _repo


_orchestrator: ResearchOrchestrator | None = None


async def get_orchestrator() -> ResearchOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        s = get_settings()
        repo = await get_repo()
        runner = AgentRunner(s)
        parser = ReportParser()
        _orchestrator = ResearchOrchestrator(runner, parser, repo)
    return _orchestrator
