use std::sync::Arc;

use axum::extract::State;
use axum::Json;

use crate::auth::service::create_token;
use crate::errors::AppError;
use crate::types::requests::{AuthRequest, AuthToken};
use crate::AppState;

pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(request): Json<AuthRequest>,
) -> Result<Json<AuthToken>, AppError> {
    let token = create_token(&request.password, &state.settings)?;
    Ok(Json(token))
}
