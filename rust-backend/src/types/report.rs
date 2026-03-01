use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::enums::ResearchStatus;
use super::events::{CompletenessAudit, DeepDive, ViralEvent};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineResult {
    pub status: ResearchStatus,
    pub raw_markdown: String,
    pub tldr: Option<String>,
    pub viral_events: Vec<ViralEvent>,
    pub deep_dives: Vec<DeepDive>,
    pub completeness_audit: Option<CompletenessAudit>,
    pub started_at: DateTime<Utc>,
    pub completed_at: DateTime<Utc>,
    pub duration_seconds: f64,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchReport {
    pub report_id: String,
    pub run_date: DateTime<Utc>,
    pub result: Option<EngineResult>,
    pub created_at: DateTime<Utc>,
}
