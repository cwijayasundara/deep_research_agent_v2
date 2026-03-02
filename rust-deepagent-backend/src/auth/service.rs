use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::config::Settings;
use crate::errors::AppError;
use crate::types::requests::AuthToken;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub iat: i64,
    pub exp: i64,
}

pub fn create_token(password: &str, settings: &Settings) -> Result<AuthToken, AppError> {
    if password != settings.app_shared_password {
        tracing::warn!("Failed authentication attempt");
        return Err(AppError::Auth("Invalid password".into()));
    }

    let now = Utc::now();
    let claims = Claims {
        sub: "user".into(),
        iat: now.timestamp(),
        exp: (now + Duration::hours(settings.jwt_expire_hours)).timestamp(),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(settings.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("JWT encoding failed: {e}")))?;

    Ok(AuthToken {
        access_token: token,
        token_type: "bearer".into(),
    })
}

pub fn verify_token(token: &str, settings: &Settings) -> Result<Claims, AppError> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(settings.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|e| AppError::Auth(format!("Invalid token: {e}")))
}
