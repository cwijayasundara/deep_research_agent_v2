use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ResearchStatus {
    Pending,
    Running,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ConfidenceLevel {
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum EventCategory {
    Model,
    Infra,
    Market,
    Regulation,
    MoatAttack,
    // Backward compat: old variants kept for deserialization of legacy reports
    #[serde(alias = "product_launch")]
    ProductLaunch,
    #[serde(alias = "funding")]
    Funding,
    #[serde(alias = "partnership")]
    Partnership,
    #[serde(alias = "research")]
    Research,
    #[serde(alias = "open_source")]
    OpenSource,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum WhyIncludedTag {
    #[serde(alias = "A")]
    A,
    #[serde(alias = "B")]
    B,
    #[serde(alias = "C")]
    C,
    #[serde(alias = "D")]
    D,
    #[serde(alias = "E")]
    E,
    #[serde(alias = "F")]
    F,
    #[serde(alias = "G")]
    G,
}
