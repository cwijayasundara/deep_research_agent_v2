"""Parse engine markdown output into structured types."""

import logging
import re

from backend.types.enums import ConfidenceLevel, EventCategory
from backend.types.events import CompletenessAudit, DeepDive, ViralEvent

logger = logging.getLogger(__name__)

CATEGORY_MAP: dict[str, EventCategory] = {
    "product_launch": EventCategory.PRODUCT_LAUNCH,
    "funding": EventCategory.FUNDING,
    "partnership": EventCategory.PARTNERSHIP,
    "regulation": EventCategory.REGULATION,
    "research": EventCategory.RESEARCH,
    "open_source": EventCategory.OPEN_SOURCE,
}

CONFIDENCE_MAP: dict[str, ConfidenceLevel] = {
    "high": ConfidenceLevel.HIGH,
    "medium": ConfidenceLevel.MEDIUM,
    "low": ConfidenceLevel.LOW,
}


class ReportParser:
    def parse_tldr(self, markdown: str) -> str:
        match = re.search(
            r"##\s*TL;DR\s*\n(.*?)(?=\n## (?!#)|\Z)", markdown, re.DOTALL
        )
        return match.group(1).strip() if match else ""

    def parse_viral_events(self, markdown: str) -> list[ViralEvent]:
        events: list[ViralEvent] = []
        section = re.search(
            r"##\s*Global Viral Events\s*\n(.*?)(?=\n## (?!#)|\Z)",
            markdown,
            re.DOTALL,
        )
        if not section:
            return events

        event_blocks = re.split(r"\n###\s+", section.group(1))
        for block in event_blocks:
            block = block.strip()
            if not block:
                continue
            event = self._parse_single_event(block)
            if event:
                events.append(event)
        return events

    def _parse_single_event(self, block: str) -> ViralEvent | None:
        lines = block.split("\n")
        headline = re.sub(r"^#+\s*", "", lines[0].strip())
        if not headline:
            return None

        fields: dict[str, str] = {}
        for line in lines[1:]:
            match = re.match(
                r"-\s*\*\*(.+?)\*\*:\s*(.+)", line.strip()
            )
            if match:
                fields[match.group(1).lower()] = match.group(2).strip()

        category_str = fields.get("category", "research")
        category = CATEGORY_MAP.get(category_str, EventCategory.RESEARCH)
        confidence_str = fields.get("confidence", "medium")
        confidence = CONFIDENCE_MAP.get(
            confidence_str, ConfidenceLevel.MEDIUM
        )

        try:
            impact = int(fields.get("impact rating", "5"))
        except ValueError:
            impact = 5

        return ViralEvent(
            headline=headline,
            category=category,
            impact_rating=max(1, min(10, impact)),
            confidence=confidence,
            source=fields.get("source", "Unknown"),
            summary=fields.get("summary", ""),
        )

    def parse_deep_dives(self, markdown: str) -> list[DeepDive]:
        dives: list[DeepDive] = []
        section = re.search(
            r"##\s*Strategic Deep Dives\s*\n(.*?)(?=\n## (?!#)|\Z)",
            markdown,
            re.DOTALL,
        )
        if not section:
            return dives

        dive_blocks = re.split(r"\n###\s+", section.group(1))
        for block in dive_blocks:
            block = block.strip()
            if not block:
                continue
            dive = self._parse_single_dive(block)
            if dive:
                dives.append(dive)
        return dives

    def _parse_single_dive(self, block: str) -> DeepDive | None:
        lines = block.split("\n")
        title = re.sub(r"^#+\s*", "", lines[0].strip())
        if not title:
            return None

        fields: dict[str, str] = {}
        findings: list[str] = []
        in_findings = False

        for line in lines[1:]:
            stripped = line.strip()
            if stripped.startswith("- **Key Findings**"):
                in_findings = True
                continue
            if in_findings and stripped.startswith("- "):
                findings.append(stripped[2:].strip())
                continue
            if not in_findings:
                match = re.match(
                    r"-\s*\*\*(.+?)\*\*:\s*(.+)", stripped
                )
                if match:
                    fields[match.group(1).lower()] = match.group(2).strip()

        return DeepDive(
            title=title,
            priority=fields.get("priority", "MEDIUM"),
            summary=fields.get("summary", ""),
            key_findings=findings,
        )

    def parse_completeness_audit(
        self, markdown: str
    ) -> CompletenessAudit | None:
        section = re.search(
            r"##\s*Completeness Audit\s*\n(.*?)(?=\n## (?!#)|\Z)",
            markdown,
            re.DOTALL,
        )
        if not section:
            return None

        text = section.group(1)
        fields: dict[str, str] = {}
        for line in text.split("\n"):
            match = re.match(r"-\s*\*\*(.+?)\*\*:\s*(.+)", line.strip())
            if match:
                fields[match.group(1).lower()] = match.group(2).strip()

        try:
            signals = int(fields.get("verified signals", "0"))
            sources = int(fields.get("sources checked", "0"))
            score = float(fields.get("confidence score", "0.0"))
        except ValueError:
            return None

        gaps_str = fields.get("gaps", "")
        gaps = [g.strip() for g in gaps_str.split(",") if g.strip()]

        return CompletenessAudit(
            verified_signals=signals,
            sources_checked=sources,
            confidence_score=score,
            gaps=gaps,
        )
