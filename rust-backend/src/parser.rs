use regex::Regex;

use crate::types::enums::{ConfidenceLevel, EventCategory};
use crate::types::events::{CompletenessAudit, DeepDive, ViralEvent};

pub fn parse_tldr(markdown: &str) -> Option<String> {
    let re = Regex::new(r"(?s)##\s*TL;DR\s*\n(.*?)(?:\n## |\z)").unwrap();
    re.captures(markdown)
        .map(|cap| cap[1].trim().to_string())
        .filter(|s| !s.is_empty())
}

pub fn parse_viral_events(markdown: &str) -> Vec<ViralEvent> {
    let section_re =
        Regex::new(r"(?s)##\s*Global Viral Events\s*\n(.*?)(?:\n## |\z)").unwrap();
    let section = match section_re.captures(markdown) {
        Some(cap) => cap[1].to_string(),
        None => return Vec::new(),
    };

    let split_re = Regex::new(r"\n###\s+").unwrap();
    let blocks: Vec<&str> = split_re.split(&section).collect();

    blocks
        .into_iter()
        .filter_map(|block| {
            let block = block.trim();
            if block.is_empty() {
                return None;
            }
            parse_single_event(block)
        })
        .collect()
}

fn parse_single_event(block: &str) -> Option<ViralEvent> {
    let lines: Vec<&str> = block.lines().collect();
    let heading_re = Regex::new(r"^#+\s*").unwrap();
    let headline = heading_re.replace(lines.first()?.trim(), "").to_string();
    if headline.is_empty() {
        return None;
    }

    let field_re = Regex::new(r#"-\s*\*\*(.+?)\*\*:\s*(.+)"#).unwrap();
    let mut fields = std::collections::HashMap::new();
    for line in &lines[1..] {
        if let Some(cap) = field_re.captures(line.trim()) {
            fields.insert(cap[1].to_lowercase(), cap[2].trim().to_string());
        }
    }

    let category = match fields.get("category").map(|s| s.as_str()) {
        Some("product_launch") => EventCategory::ProductLaunch,
        Some("funding") => EventCategory::Funding,
        Some("partnership") => EventCategory::Partnership,
        Some("regulation") => EventCategory::Regulation,
        Some("research") => EventCategory::Research,
        Some("open_source") => EventCategory::OpenSource,
        _ => EventCategory::Research,
    };

    let confidence = match fields.get("confidence").map(|s| s.as_str()) {
        Some("high") => ConfidenceLevel::High,
        Some("medium") => ConfidenceLevel::Medium,
        Some("low") => ConfidenceLevel::Low,
        _ => ConfidenceLevel::Medium,
    };

    let impact: i32 = fields
        .get("impact rating")
        .and_then(|s| s.parse().ok())
        .unwrap_or(5)
        .max(1)
        .min(10);

    let source = fields
        .get("source")
        .cloned()
        .unwrap_or_else(|| "Unknown".into());
    let summary = fields.get("summary").cloned().unwrap_or_default();

    Some(ViralEvent {
        headline,
        category,
        impact_rating: impact,
        confidence,
        source,
        summary,
    })
}

pub fn parse_deep_dives(markdown: &str) -> Vec<DeepDive> {
    let section_re =
        Regex::new(r"(?s)##\s*Strategic Deep Dives\s*\n(.*?)(?:\n## |\z)").unwrap();
    let section = match section_re.captures(markdown) {
        Some(cap) => cap[1].to_string(),
        None => return Vec::new(),
    };

    let split_re = Regex::new(r"\n###\s+").unwrap();
    let blocks: Vec<&str> = split_re.split(&section).collect();

    blocks
        .into_iter()
        .filter_map(|block| {
            let block = block.trim();
            if block.is_empty() {
                return None;
            }
            parse_single_dive(block)
        })
        .collect()
}

fn parse_single_dive(block: &str) -> Option<DeepDive> {
    let lines: Vec<&str> = block.lines().collect();
    let heading_re = Regex::new(r"^#+\s*").unwrap();
    let title = heading_re.replace(lines.first()?.trim(), "").to_string();
    if title.is_empty() {
        return None;
    }

    let field_re = Regex::new(r#"-\s*\*\*(.+?)\*\*:\s*(.+)"#).unwrap();
    let mut fields = std::collections::HashMap::new();
    let mut findings = Vec::new();
    let mut in_findings = false;

    for line in &lines[1..] {
        let stripped = line.trim();
        if stripped.starts_with("- **Key Findings**") {
            in_findings = true;
            continue;
        }
        if in_findings && stripped.starts_with("- ") {
            findings.push(stripped[2..].trim().to_string());
            continue;
        }
        if !in_findings {
            if let Some(cap) = field_re.captures(stripped) {
                fields.insert(cap[1].to_lowercase(), cap[2].trim().to_string());
            }
        }
    }

    Some(DeepDive {
        title,
        priority: fields
            .get("priority")
            .cloned()
            .unwrap_or_else(|| "MEDIUM".into()),
        summary: fields.get("summary").cloned().unwrap_or_default(),
        key_findings: findings,
    })
}

pub fn parse_completeness_audit(markdown: &str) -> Option<CompletenessAudit> {
    let section_re =
        Regex::new(r"(?s)##\s*Completeness Audit\s*\n(.*?)(?:\n## |\z)").unwrap();
    let section = section_re.captures(markdown)?;
    let text = &section[1];

    let field_re = Regex::new(r#"-\s*\*\*(.+?)\*\*:\s*(.+)"#).unwrap();
    let mut fields = std::collections::HashMap::new();
    for line in text.lines() {
        if let Some(cap) = field_re.captures(line.trim()) {
            fields.insert(cap[1].to_lowercase(), cap[2].trim().to_string());
        }
    }

    let verified_signals: i32 = fields.get("verified signals")?.parse().ok()?;
    let sources_checked: i32 = fields.get("sources checked")?.parse().ok()?;
    let confidence_score: f64 = fields.get("confidence score")?.parse().ok()?;

    let gaps: Vec<String> = fields
        .get("gaps")
        .map(|s| {
            s.split(',')
                .map(|g| g.trim().to_string())
                .filter(|g| !g.is_empty())
                .collect()
        })
        .unwrap_or_default();

    Some(CompletenessAudit {
        verified_signals,
        sources_checked,
        confidence_score,
        gaps,
    })
}
