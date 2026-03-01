use serde::{Deserialize, Serialize};

use super::report::ResearchReport;

#[derive(Debug, Deserialize)]
pub struct ResearchRequest {
    pub date: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ReportListResponse {
    pub reports: Vec<ResearchReport>,
    pub total: usize,
}

#[derive(Debug, Deserialize)]
pub struct AuthRequest {
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthToken {
    pub access_token: String,
    pub token_type: String,
}
