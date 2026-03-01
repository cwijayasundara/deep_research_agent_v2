use std::sync::Arc;

use axum::extract::{Path, State};
use axum::Json;
use chrono::Utc;

use crate::auth::middleware::AuthUser;
use crate::errors::AppError;
use crate::orchestration::runner::run_daily_research;
use crate::types::enums::ResearchStatus;
use crate::types::report::{EngineResult, ResearchReport};
use crate::types::requests::{ReportListResponse, ResearchRequest};
use crate::AppState;

pub async fn list_reports(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
) -> Result<Json<ReportListResponse>, AppError> {
    let reports = state.repo.list_reports(20).await?;
    let total = reports.len();
    Ok(Json(ReportListResponse { reports, total }))
}

pub async fn get_report(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(report_id): Path<String>,
) -> Result<Json<ResearchReport>, AppError> {
    let report = state
        .repo
        .get_report(&report_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Report not found".into()))?;
    Ok(Json(report))
}

pub async fn trigger_research(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Json(request): Json<ResearchRequest>,
) -> Result<Json<ResearchReport>, AppError> {
    let date = request
        .date
        .unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string());

    tracing::info!(date = %date, "Research trigger requested");

    let report_id = format!("rpt-{date}");

    if let Some(existing) = state.repo.get_report(&report_id).await? {
        if let Some(ref result) = existing.result {
            match result.status {
                ResearchStatus::Completed | ResearchStatus::Running => {
                    tracing::info!(
                        report_id = %report_id,
                        status = ?result.status,
                        "Reusing existing report (skipping new research)"
                    );
                    return Ok(Json(existing));
                }
                _ => {
                    tracing::info!(
                        report_id = %report_id,
                        status = ?result.status,
                        error_message = result.error_message.as_deref().unwrap_or("none"),
                        "Found existing report with non-terminal status, allowing re-trigger"
                    );
                }
            }
        }
    } else {
        tracing::info!(report_id = %report_id, "No existing report found, starting fresh");
    }

    let now = Utc::now();
    let running_report = ResearchReport {
        report_id,
        run_date: now,
        result: Some(EngineResult {
            status: ResearchStatus::Running,
            raw_markdown: String::new(),
            tldr: None,
            viral_events: Vec::new(),
            deep_dives: Vec::new(),
            completeness_audit: None,
            started_at: now,
            completed_at: now,
            duration_seconds: 0.0,
            error_message: None,
        }),
        created_at: now,
    };

    state.repo.save_report(&running_report).await?;
    tracing::info!(
        report_id = %running_report.report_id,
        "Saved Running report, spawning background research task"
    );

    // Spawn background task
    let bg_report_id = running_report.report_id.clone();
    let state_clone = state.clone();
    let date_clone = date.clone();
    tokio::spawn(async move {
        tracing::info!(report_id = %bg_report_id, "Background research task started");
        match run_daily_research(&date_clone, &state_clone).await {
            Ok(report) => {
                let status = report
                    .result
                    .as_ref()
                    .map(|r| format!("{:?}", r.status))
                    .unwrap_or_else(|| "unknown".into());
                tracing::info!(
                    report_id = %bg_report_id,
                    final_status = %status,
                    "Background research task completed"
                );
            }
            Err(e) => {
                tracing::error!(
                    report_id = %bg_report_id,
                    error = %e,
                    "Background research task FAILED"
                );
            }
        }
    });

    Ok(Json(running_report))
}
