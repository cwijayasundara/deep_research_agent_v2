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

fn make_running_report(report_id: String) -> ResearchReport {
    let now = Utc::now();
    ResearchReport {
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
    }
}

pub async fn list_reports(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
) -> Result<Json<ReportListResponse>, AppError> {
    let mut reports = state.repo.list_reports(20).await?;

    // Merge in-memory running reports that aren't yet persisted to DB
    let running_ids = state.running_reports.read().await;
    for id in running_ids.iter() {
        if !reports.iter().any(|r| r.report_id == *id) {
            reports.push(make_running_report(id.clone()));
        }
    }

    // Sort by run_date descending so running reports appear at the top
    reports.sort_by(|a, b| b.run_date.cmp(&a.run_date));

    let total = reports.len();
    Ok(Json(ReportListResponse { reports, total }))
}

pub async fn get_report(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(report_id): Path<String>,
) -> Result<Json<ResearchReport>, AppError> {
    if let Some(report) = state.repo.get_report(&report_id).await? {
        return Ok(Json(report));
    }

    if state.running_reports.read().await.contains(&report_id) {
        return Ok(Json(make_running_report(report_id)));
    }

    Err(AppError::NotFound("Report not found".into()))
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

    // Check if research is already running in-memory
    if state.running_reports.read().await.contains(&report_id) {
        tracing::info!(report_id = %report_id, "Research already running");
        return Ok(Json(make_running_report(report_id)));
    }

    // Check if a completed report already exists in DB
    if let Some(existing) = state.repo.get_report(&report_id).await? {
        if let Some(ref result) = existing.result {
            if result.status == ResearchStatus::Completed {
                tracing::info!(
                    report_id = %report_id,
                    "Reusing existing completed report (skipping new research)"
                );
                return Ok(Json(existing));
            }
            tracing::info!(
                report_id = %report_id,
                status = ?result.status,
                error_message = result.error_message.as_deref().unwrap_or("none"),
                "Found existing non-completed report, allowing re-trigger"
            );
        }
    } else {
        tracing::info!(report_id = %report_id, "No existing report found, starting fresh");
    }

    // Mark as running in memory (NOT persisted to DB)
    state.running_reports.write().await.insert(report_id.clone());

    let running_report = make_running_report(report_id);

    tracing::info!(
        report_id = %running_report.report_id,
        "Spawning background research task"
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
        // Remove from in-memory running set regardless of outcome
        state_clone.running_reports.write().await.remove(&bg_report_id);
    });

    Ok(Json(running_report))
}
