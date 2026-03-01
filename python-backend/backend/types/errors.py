"""Application error hierarchy."""


class AppError(Exception):
    """Base application error."""


class AgentError(AppError):
    """Error from the research agent pipeline."""


class DatabaseError(AppError):
    """Error from database operations."""


class AuthError(AppError):
    """Authentication or authorization error."""
