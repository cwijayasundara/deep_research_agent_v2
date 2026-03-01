"""Thin wrapper invoking the DeepAgents research agent."""

import logging
import time

from backend.config.settings import Settings

logger = logging.getLogger(__name__)


def _extract_text(content) -> str:
    """Extract plain text from message content (handles both str and list-of-blocks)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return "\n".join(parts)
    return str(content)

ORCHESTRATOR_QUERY_TEMPLATE = (
    "Produce a comprehensive daily AI intelligence report for {date}. "
    "Cover the most significant and viral developments in the AI industry "
    "from the past 24 hours. Today's date is {date}. "
    "You MUST return at least 10 Global Viral Events, each with a summary of at least 100 words. "
    "You MUST produce a Strategic Deep Dive for EVERY event (all 10+) with references. "
    "Follow the report format exactly as specified in your instructions."
)


class AgentRunner:
    def __init__(self, settings: Settings) -> None:
        from agent import build_agent
        # Model name can include provider prefix (e.g. "google_genai:gemini-3-flash-preview")
        # or be a plain name (e.g. "gpt-4o") which defaults to openai.
        model_name = settings.python_model
        if ":" not in model_name:
            model_name = f"openai:{model_name}"
        self._model_name = model_name
        self._agent = build_agent(model_name=model_name)
        logger.info("AgentRunner initialized model=%s", model_name)

    async def run_research(self, date: str) -> str:
        query = ORCHESTRATOR_QUERY_TEMPLATE.format(date=date)
        logger.info(
            "Starting agent research date=%s model=%s",
            date,
            self._model_name,
        )
        start = time.monotonic()
        try:
            result = await self._agent.ainvoke(
                {"messages": [{"role": "user", "content": query}]}
            )
        except Exception:
            duration = time.monotonic() - start
            logger.exception(
                "Agent ainvoke FAILED date=%s duration=%.1fs",
                date,
                duration,
            )
            raise

        duration = time.monotonic() - start
        messages = result.get("messages", [])
        msg_count = len(messages)

        # The final report is the longest AI message — the last message may be
        # a short summary or tool-call wrapper, not the full report.
        raw_markdown = ""
        for msg in reversed(messages):
            role = getattr(msg, "type", None) or getattr(msg, "role", "")
            content = getattr(msg, "content", "") or ""
            # Gemini returns content as a list of blocks; extract text parts.
            content = _extract_text(content)
            if role == "ai" and len(content) > len(raw_markdown):
                raw_markdown = content

        # Fallback to last message if nothing found
        if not raw_markdown:
            fallback = getattr(messages[-1], "content", "") if messages else ""
            raw_markdown = _extract_text(fallback)

        logger.info(
            "Agent research complete date=%s duration=%.1fs output_len=%d message_count=%d",
            date,
            duration,
            len(raw_markdown),
            msg_count,
        )
        return raw_markdown
