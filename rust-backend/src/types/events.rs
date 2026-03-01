use serde::{Deserialize, Serialize};

use super::enums::{ConfidenceLevel, EventCategory};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViralEvent {
    pub headline: String,
    pub category: EventCategory,
    pub impact_rating: i32,
    pub confidence: ConfidenceLevel,
    pub source: String,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepDive {
    pub title: String,
    pub priority: String,
    pub summary: String,
    pub key_findings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletenessAudit {
    pub verified_signals: i32,
    pub sources_checked: i32,
    pub confidence_score: f64,
    pub gaps: Vec<String>,
}
