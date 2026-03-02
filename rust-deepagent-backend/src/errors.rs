use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Authentication error: {0}")]
    Auth(String),

    #[error("Agent error: {0}")]
    Agent(String),

    #[error("Database error: {0}")]
    Database(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::Auth(msg) => {
                tracing::warn!(error.type_ = "auth", "Auth error: {}", msg);
                (StatusCode::UNAUTHORIZED, msg.clone())
            }
            AppError::Agent(msg) => {
                tracing::error!(error.type_ = "agent", "Agent error: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, msg.clone())
            }
            AppError::Database(msg) => {
                tracing::error!(error.type_ = "database", "Database error: {}", msg);
                (StatusCode::SERVICE_UNAVAILABLE, msg.clone())
            }
            AppError::NotFound(msg) => {
                tracing::debug!(error.type_ = "not_found", "Not found: {}", msg);
                (StatusCode::NOT_FOUND, msg.clone())
            }
            AppError::Internal(msg) => {
                tracing::error!(error.type_ = "internal", "Internal error: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, msg.clone())
            }
        };

        let body = json!({ "detail": message });
        (status, axum::Json(body)).into_response()
    }
}
