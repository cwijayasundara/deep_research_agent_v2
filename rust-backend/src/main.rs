use std::collections::HashSet;
use std::sync::Arc;

use axum::http::{header, Method};
use axum::routing::{get, post};
use axum::Router;
use rig::providers::openai;
use tavily::Tavily;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

mod agents;
mod auth;
mod config;
mod errors;
mod orchestration;
mod parser;
mod repo;
mod routes;
mod types;

use config::Settings;
use repo::sqlite::SqliteRepo;

pub struct AppState {
    pub settings: Settings,
    pub openai_client: openai::Client,
    pub tavily_client: Arc<Tavily>,
    pub repo: SqliteRepo,
    /// Report IDs currently being researched (in-memory only, not persisted).
    pub running_reports: RwLock<HashSet<String>>,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug".into()),
        )
        .init();

    let settings = Settings::from_env();
    tracing::info!(
        "Starting Deep Research Agent v2 (Rust) on port {}",
        settings.app_port
    );

    let openai_client =
        openai::Client::new(&settings.openai_api_key).expect("Failed to create OpenAI client");
    let tavily_client = Arc::new(
        Tavily::builder(&settings.tavily_api_key)
            .build()
            .expect("Failed to create Tavily client"),
    );

    let db_path = "data/reports.db";
    std::fs::create_dir_all("data").expect("Failed to create data directory");
    let repo = SqliteRepo::new(db_path)
        .await
        .expect("Failed to initialize SQLite");

    let state = Arc::new(AppState {
        settings: settings.clone(),
        openai_client,
        tavily_client,
        repo,
        running_reports: RwLock::new(HashSet::new()),
    });

    let cors = CorsLayer::new()
        .allow_origin(
            settings
                .cors_origins
                .iter()
                .map(|o| o.parse().expect("Invalid CORS origin"))
                .collect::<Vec<_>>(),
        )
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE, header::ACCEPT])
        .allow_credentials(true);

    let app = Router::new()
        .route("/health", get(routes::health::health_check))
        .route("/api/auth/login", post(routes::auth::login))
        .route("/api/reports/", get(routes::reports::list_reports))
        .route(
            "/api/reports/{report_id}",
            get(routes::reports::get_report),
        )
        .route(
            "/api/reports/trigger",
            post(routes::reports::trigger_research),
        )
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = format!("0.0.0.0:{}", settings.app_port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind to address");

    tracing::info!("Listening on {}", addr);
    axum::serve(listener, app).await.expect("Server error");
}
