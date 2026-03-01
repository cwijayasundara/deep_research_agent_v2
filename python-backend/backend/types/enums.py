"""Enumerations for the deep research agent v2."""

from enum import Enum


class ResearchStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class EventCategory(str, Enum):
    MODEL = "model"
    INFRA = "infra"
    MARKET = "market"
    REGULATION = "regulation"
    MOAT_ATTACK = "moat_attack"
    # Backward compat: old variants kept for deserialization of legacy reports
    PRODUCT_LAUNCH = "product_launch"
    FUNDING = "funding"
    PARTNERSHIP = "partnership"
    RESEARCH = "research"
    OPEN_SOURCE = "open_source"


class WhyIncludedTag(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"
    F = "F"
    G = "G"
