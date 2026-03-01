"""Parse engine markdown output into structured types."""

import logging
import re

from backend.types.enums import ConfidenceLevel, EventCategory, WhyIncludedTag
from backend.types.events import CompletenessAudit, DeepDive, ViralEvent

logger = logging.getLogger(__name__)

CATEGORY_MAP: dict[str, EventCategory] = {
    "model": EventCategory.MODEL,
    "infra": EventCategory.INFRA,
    "market": EventCategory.MARKET,
    "regulation": EventCategory.REGULATION,
    "moat_attack": EventCategory.MOAT_ATTACK,
    # Backward compat
    "product_launch": EventCategory.PRODUCT_LAUNCH,
    "funding": EventCategory.FUNDING,
    "partnership": EventCategory.PARTNERSHIP,
    "research": EventCategory.RESEARCH,
    "open_source": EventCategory.OPEN_SOURCE,
}

CONFIDENCE_MAP: dict[str, ConfidenceLevel] = {
    "high": ConfidenceLevel.HIGH,
    "medium": ConfidenceLevel.MEDIUM,
    "low": ConfidenceLevel.LOW,
}

WHY_INCLUDED_MAP: dict[str, WhyIncludedTag] = {
    "A": WhyIncludedTag.A,
    "B": WhyIncludedTag.B,
    "C": WhyIncludedTag.C,
    "D": WhyIncludedTag.D,
    "E": WhyIncludedTag.E,
    "F": WhyIncludedTag.F,
    "G": WhyIncludedTag.G,
}


def _parse_why_included_tags(raw: str) -> list[WhyIncludedTag]:
    """Parse comma-separated why-included tags like 'A(Market reaction), B(Narrative dominance)'."""
    tags: list[WhyIncludedTag] = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        letter = part[0].upper()
        tag = WHY_INCLUDED_MAP.get(letter)
        if tag:
            tags.append(tag)
    return tags


class ReportParser:
    def parse_tldr(self, markdown: str) -> str:
        # Accept both "## TL;DR" and bare "TL;DR" at start of line
        match = re.search(
            r"^#{0,3}\s*TL;DR\s*\n(.*?)(?=\n#{1,3}\s|\Z)",
            markdown,
            re.DOTALL | re.MULTILINE,
        )
        return match.group(1).strip() if match else ""

    def parse_viral_events(self, markdown: str) -> list[ViralEvent]:
        events: list[ViralEvent] = []
        section = re.search(
            r"^#{0,3}\s*Global Viral Events\s*\n(.*?)(?=\n#{1,2}\s|\Z)",
            markdown,
            re.DOTALL | re.MULTILINE,
        )
        if not section:
            return events

        event_blocks = re.split(r"\n#{1,3}\s+", section.group(1))
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
        first_line = lines[0].strip()

        # Try numbered format: "1. Event Headline" or "### 1. Event Headline"
        numbered = re.match(r"^(?:#+\s*)?(\d+)\.\s*(.+)", first_line)
        if numbered:
            rank = int(numbered.group(1))
            headline = numbered.group(2).strip()
        else:
            rank = 0
            headline = re.sub(r"^#+\s*", "", first_line)

        if not headline:
            return None

        fields: dict[str, str] = {}
        what_changed: list[str] = []
        in_what_changed = False

        for line in lines[1:]:
            stripped = line.strip()
            if stripped.startswith("- **What Changed**"):
                in_what_changed = True
                continue
            if in_what_changed:
                if stripped.startswith("- **"):
                    in_what_changed = False
                elif stripped.startswith("- "):
                    what_changed.append(stripped[2:].strip())
                    continue
                elif stripped:
                    continue
                else:
                    in_what_changed = False

            match = re.match(
                r"-\s*\*\*(.+?)\*\*:\s*(.+)", stripped
            )
            if match:
                fields[match.group(1).lower()] = match.group(2).strip()

        category_str = fields.get("category", "model")
        category = CATEGORY_MAP.get(category_str, EventCategory.MODEL)
        confidence_str = fields.get("confidence", "medium")
        confidence = CONFIDENCE_MAP.get(
            confidence_str, ConfidenceLevel.MEDIUM
        )

        country_region = fields.get("country/region", "")
        why_included = _parse_why_included_tags(
            fields.get("why included", "")
        )
        revenue_impact = fields.get("revenue impact", "")
        proof_pack = fields.get("proof pack", "")

        # Backward compat: old fields
        impact_rating_str = fields.get("impact rating")
        impact_rating = None
        if impact_rating_str:
            try:
                impact_rating = max(1, min(10, int(impact_rating_str)))
            except ValueError:
                pass

        source = fields.get("source")
        summary = fields.get("summary")

        return ViralEvent(
            headline=headline,
            category=category,
            confidence=confidence,
            rank=rank,
            country_region=country_region,
            why_included=why_included,
            revenue_impact=revenue_impact,
            what_changed=what_changed,
            proof_pack=proof_pack,
            impact_rating=impact_rating,
            source=source,
            summary=summary,
        )

    def parse_deep_dives(self, markdown: str) -> list[DeepDive]:
        dives: list[DeepDive] = []
        # Accept optional suffix like "(TOP 3 EVENTS ONLY)"
        section = re.search(
            r"^#{0,3}\s*Strategic Deep Dives[^\n]*\n(.*?)(?=\n#{1,2}\s|\Z)",
            markdown,
            re.DOTALL | re.MULTILINE,
        )
        if not section:
            return dives

        dive_blocks = re.split(r"\n#{1,3}\s+", section.group(1))
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
        first_line = lines[0].strip()
        title_match = re.match(r"^(?:#+\s*)?(?:\d+\.\s*)?(.+)", first_line)
        title = title_match.group(1).strip() if title_match else first_line
        if not title:
            return None

        # Extract named #### sections
        sections: dict[str, str] = {}
        current_section: str | None = None
        current_content: list[str] = []

        # Old format fields
        old_fields: dict[str, str] = {}
        old_findings: list[str] = []
        in_findings = False

        for line in lines[1:]:
            stripped = line.strip()

            # Check for #### subsection header
            if stripped.startswith("#### "):
                if current_section is not None:
                    sections[current_section] = "\n".join(
                        current_content
                    ).strip()
                current_section = stripped[5:].strip().lower()
                current_content = []
                continue

            if current_section is not None:
                current_content.append(stripped)
            else:
                # Old format parsing
                if stripped.startswith("- **Key Findings**"):
                    in_findings = True
                    continue
                if in_findings and stripped.startswith("- "):
                    old_findings.append(stripped[2:].strip())
                    continue
                if not in_findings:
                    match = re.match(
                        r"-\s*\*\*(.+?)\*\*:\s*(.+)", stripped
                    )
                    if match:
                        old_fields[match.group(1).lower()] = (
                            match.group(2).strip()
                        )

        # Save last section
        if current_section is not None:
            sections[current_section] = "\n".join(current_content).strip()

        what_happened = sections.get("what happened", "")
        why_it_matters = sections.get(
            "why it matters mechanically",
            sections.get("why it matters", ""),
        )
        second_order = sections.get(
            "second-order implications",
            sections.get("second order implications", ""),
        )
        what_to_watch = sections.get(
            "what to watch next week",
            sections.get("what to watch", ""),
        )

        return DeepDive(
            title=title,
            what_happened=what_happened,
            why_it_matters=why_it_matters,
            second_order_implications=second_order,
            what_to_watch=what_to_watch,
            priority=old_fields.get("priority"),
            summary=old_fields.get("summary"),
            key_findings=old_findings if old_findings else None,
        )

    def parse_completeness_audit(
        self, markdown: str
    ) -> CompletenessAudit | None:
        # Accept both "## Completeness Audit" and bare heading
        section = re.search(
            r"^#{0,3}\s*Completeness Audit\s*\n(.*?)(?=\n#{1,2}\s|\Z)",
            markdown,
            re.DOTALL | re.MULTILINE,
        )
        if not section:
            return None

        text = section.group(1)
        fields: dict[str, str] = {}

        reuters_articles: list[str] = []
        major_stock_moves: list[str] = []
        vendor_coverage: list[str] = []
        current_list: list[str] | None = None

        for line in text.split("\n"):
            stripped = line.strip()

            if stripped.startswith("- **Reuters Articles Reviewed**"):
                current_list = reuters_articles
                continue
            if stripped.startswith("- **Major Stock Moves**"):
                current_list = major_stock_moves
                continue
            if stripped.lower().startswith(
                "- **vendor coverage by region**"
            ):
                current_list = vendor_coverage
                continue

            if current_list is not None:
                if stripped.startswith("- "):
                    current_list.append(stripped[2:].strip())
                    continue
                elif stripped and not stripped.startswith("- **"):
                    continue
                else:
                    current_list = None

            match = re.match(r"-\s*\*\*(.+?)\*\*:\s*(.+)", stripped)
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
            reuters_articles=reuters_articles,
            major_stock_moves=major_stock_moves,
            vendor_coverage=vendor_coverage,
        )
