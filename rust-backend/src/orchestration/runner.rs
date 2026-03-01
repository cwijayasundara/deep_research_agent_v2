use chrono::Utc;

use crate::agents::orchestrator::run_research;
use crate::errors::AppError;
use crate::parser;
use crate::types::enums::ResearchStatus;
use crate::types::report::{EngineResult, ResearchReport};
use crate::AppState;

pub async fn run_daily_research(
    date: &str,
    state: &AppState,
) -> Result<ResearchReport, AppError> {
    let total_start = std::time::Instant::now();
    let report_id = format!("rpt-{date}");
    let started_at = Utc::now();

    tracing::info!(
        report_id = %report_id,
        model = %state.settings.openai_model,
        "Starting multi-agent research for {}",
        date
    );

    let result = match run_research(
        &state.openai_client,
        &state.settings.openai_model,
        state.tavily_client.clone(),
        &state.settings.tavily_api_key,
        date,
    )
    .await
    {
        Ok(raw_markdown) => {
            let agent_duration = total_start.elapsed().as_secs_f64();
            tracing::info!(
                report_id = %report_id,
                agent_duration_s = agent_duration,
                output_len = raw_markdown.len(),
                "Agent pipeline completed, parsing structured data..."
            );

            let completed_at = Utc::now();
            let tldr = parser::parse_tldr(&raw_markdown);
            let viral_events = parser::parse_viral_events(&raw_markdown);
            let deep_dives = parser::parse_deep_dives(&raw_markdown);
            let completeness_audit = parser::parse_completeness_audit(&raw_markdown);

            let duration = total_start.elapsed().as_secs_f64();
            tracing::info!(
                report_id = %report_id,
                events_count = viral_events.len(),
                dives_count = deep_dives.len(),
                has_tldr = tldr.is_some(),
                duration_s = duration,
                "Parsing complete"
            );

            EngineResult {
                status: ResearchStatus::Completed,
                raw_markdown: raw_markdown.clone(),
                tldr,
                viral_events,
                deep_dives,
                completeness_audit,
                started_at,
                completed_at,
                duration_seconds: duration,
                error_message: None,
            }
        }
        Err(err) => {
            let completed_at = Utc::now();
            let duration = total_start.elapsed().as_secs_f64();
            tracing::error!(
                report_id = %report_id,
                duration_s = duration,
                error = %err,
                "Research pipeline FAILED"
            );

            EngineResult {
                status: ResearchStatus::Failed,
                raw_markdown: String::new(),
                tldr: None,
                viral_events: Vec::new(),
                deep_dives: Vec::new(),
                completeness_audit: None,
                started_at,
                completed_at,
                duration_seconds: duration,
                error_message: Some(err),
            }
        }
    };

    let report = ResearchReport {
        report_id,
        run_date: started_at,
        result: Some(result),
        created_at: started_at,
    };

    state.repo.save_report(&report).await?;

    let total_duration = total_start.elapsed().as_secs_f64();
    tracing::info!(
        "Research complete: {} in {:.1}s total",
        report.report_id,
        total_duration
    );

    Ok(report)
}
