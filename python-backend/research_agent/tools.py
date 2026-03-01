"""Research Tools.

This module provides search utilities for the research agent using Tavily.
"""

import logging
import os
import time

from langchain_core.tools import InjectedToolArg, tool
from tavily import TavilyClient
from typing_extensions import Annotated, Literal

logger = logging.getLogger(__name__)

_tavily_client: TavilyClient | None = None


def _get_tavily_client() -> TavilyClient:
    """Lazy-init the Tavily client so the API key can come from Settings/.env."""
    global _tavily_client
    if _tavily_client is None:
        api_key = os.environ.get("TAVILY_API_KEY", "")
        _tavily_client = TavilyClient(api_key=api_key)
    return _tavily_client


@tool(parse_docstring=True)
def tavily_search(
    query: str,
    max_results: Annotated[int, InjectedToolArg] = 10,
    topic: Annotated[
        Literal["general", "news", "finance"], InjectedToolArg
    ] = "news",
) -> str:
    """Search the web for information on a given query.

    Args:
        query: Search query to execute
        max_results: Maximum number of results to return (default: 10)
        topic: Topic filter - 'general', 'news', or 'finance' (default: 'news')

    Returns:
        Formatted search results with content snippets
    """
    start = time.monotonic()
    logger.info("Tavily search starting query=%r topic=%s", query, topic)

    try:
        search_results = _get_tavily_client().search(
            query,
            max_results=max_results,
            topic=topic,
            days=7,
        )
    except Exception:
        logger.exception(
            "Tavily search FAILED query=%r duration=%.1fs",
            query,
            time.monotonic() - start,
        )
        raise

    result_texts = []
    for result in search_results.get("results", []):
        url = result["url"]
        title = result["title"]
        content = result.get("content", "")
        logger.debug("Search result: title=%r url=%s", title, url)
        result_texts.append(f"## {title}\n**URL:** {url}\n\n{content}\n\n---")

    logger.info(
        "Tavily search completed query=%r results=%d duration=%.1fs",
        query,
        len(result_texts),
        time.monotonic() - start,
    )

    return f"Found {len(result_texts)} result(s) for '{query}':\n\n{chr(10).join(result_texts)}"


@tool(parse_docstring=True)
def think_tool(reflection: str) -> str:
    """Tool for strategic reflection on research progress and decision-making.

    Use this tool after each search to analyze results and plan next steps
    systematically.

    Args:
        reflection: Your detailed reflection on research progress, findings, gaps,
                   and next steps

    Returns:
        Confirmation that reflection was recorded for decision-making
    """
    return f"Reflection recorded: {reflection}"
