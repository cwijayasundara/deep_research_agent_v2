use std::env;

fn parse_cors_origins(raw: &str) -> Vec<String> {
    let trimmed = raw.trim();
    let inner = trimmed
        .strip_prefix('[')
        .and_then(|s| s.strip_suffix(']'))
        .unwrap_or(trimmed);
    inner
        .split(',')
        .map(|s| s.trim().trim_matches('"').trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

#[derive(Debug, Clone)]
pub struct Settings {
    pub app_env: String,
    pub app_port: u16,
    pub openai_api_key: String,
    pub tavily_api_key: String,
    pub app_shared_password: String,
    pub jwt_secret: String,
    pub jwt_algorithm: String,
    pub jwt_expire_hours: i64,
    pub openai_model: String,
    pub cors_origins: Vec<String>,
}

impl Settings {
    pub fn from_env() -> Self {
        Self {
            app_env: env::var("APP_ENV").unwrap_or_else(|_| "development".into()),
            app_port: env::var("APP_PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(8000),
            openai_api_key: env::var("OPENAI_API_KEY").expect("OPENAI_API_KEY must be set"),
            tavily_api_key: env::var("TAVILY_API_KEY").expect("TAVILY_API_KEY must be set"),
            app_shared_password: env::var("APP_SHARED_PASSWORD")
                .expect("APP_SHARED_PASSWORD must be set"),
            jwt_secret: env::var("JWT_SECRET").expect("JWT_SECRET must be set"),
            jwt_algorithm: env::var("JWT_ALGORITHM").unwrap_or_else(|_| "HS256".into()),
            jwt_expire_hours: env::var("JWT_EXPIRE_HOURS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(24),
            openai_model: env::var("OPENAI_MODEL").unwrap_or_else(|_| "gpt-4o".into()),
            cors_origins: parse_cors_origins(
                &env::var("CORS_ORIGINS").unwrap_or_else(|_| "http://localhost:3000".into()),
            ),
        }
    }
}
