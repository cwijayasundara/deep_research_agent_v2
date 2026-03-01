"""Deep research agent -- adapted from DeepAgents example."""

import logging
from datetime import datetime

from langchain.chat_models import init_chat_model
from deepagents import create_deep_agent

from research_agent.prompts import (
    RESEARCHER_INSTRUCTIONS,
    RESEARCH_WORKFLOW_INSTRUCTIONS,
    SUBAGENT_DELEGATION_INSTRUCTIONS,
)
from research_agent.tools import tavily_search, think_tool

logger = logging.getLogger(__name__)

MAX_CONCURRENT_RESEARCH_UNITS = 3
MAX_RESEARCHER_ITERATIONS = 5


def build_agent(model_name: str = "google_genai:gemini-3-flash-preview"):
    """Build the deep research agent with configurable model."""
    current_date = datetime.now().strftime("%Y-%m-%d")

    orchestrator_instructions = (
        RESEARCH_WORKFLOW_INSTRUCTIONS.format(date=current_date)
        + "\n\n"
        + "=" * 80
        + "\n\n"
        + SUBAGENT_DELEGATION_INSTRUCTIONS.format(
            max_concurrent_research_units=MAX_CONCURRENT_RESEARCH_UNITS,
            max_researcher_iterations=MAX_RESEARCHER_ITERATIONS,
        )
    )

    research_sub_agent = {
        "name": "research-agent",
        "description": (
            "Delegate research to the sub-agent researcher. "
            "Only give this researcher one topic at a time."
        ),
        "system_prompt": RESEARCHER_INSTRUCTIONS.format(date=current_date),
        "tools": [tavily_search, think_tool],
    }

    model = init_chat_model(model=model_name, temperature=0.0)

    return create_deep_agent(
        model=model,
        tools=[tavily_search, think_tool],
        system_prompt=orchestrator_instructions,
        subagents=[research_sub_agent],
    )
