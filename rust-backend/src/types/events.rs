use serde::{Deserialize, Serialize};

use super::enums::{ConfidenceLevel, EventCategory, WhyIncludedTag};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViralEvent {
    pub headline: String,
    pub category: EventCategory,
    pub confidence: ConfidenceLevel,
    #[serde(default)]
    pub rank: i32,
    #[serde(default)]
    pub country_region: String,
    #[serde(default)]
    pub why_included: Vec<WhyIncludedTag>,
    #[serde(default)]
    pub revenue_impact: String,
    #[serde(default)]
    pub what_changed: Vec<String>,
    #[serde(default)]
    pub proof_pack: String,
    // Backward compat: old fields kept as Option so legacy reports still deserialize
    #[serde(default)]
    pub impact_rating: Option<i32>,
    #[serde(default)]
    pub source: Option<String>,
    #[serde(default)]
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepDive {
    pub title: String,
    #[serde(default)]
    pub what_happened: String,
    #[serde(default)]
    pub why_it_matters: String,
    #[serde(default)]
    pub second_order_implications: String,
    #[serde(default)]
    pub what_to_watch: String,
    // Backward compat: old fields kept as Option
    #[serde(default)]
    pub priority: Option<String>,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub key_findings: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletenessAudit {
    pub verified_signals: i32,
    pub sources_checked: i32,
    pub confidence_score: f64,
    pub gaps: Vec<String>,
    #[serde(default)]
    pub reuters_articles: Vec<String>,
    #[serde(default)]
    pub major_stock_moves: Vec<String>,
    #[serde(default)]
    pub vendor_coverage: Vec<String>,
}
