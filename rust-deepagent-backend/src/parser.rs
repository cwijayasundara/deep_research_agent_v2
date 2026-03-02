use regex::Regex;

use crate::types::enums::{ConfidenceLevel, EventCategory, WhyIncludedTag};
use crate::types::events::{CompletenessAudit, DeepDive, ViralEvent};

pub fn parse_tldr(markdown: &str) -> Option<String> {
    // Accept both "## TL;DR" and bare "TL;DR" at start of line
    let re = Regex::new(r"(?sm)^#{0,3}\s*TL;DR\s*\n(.*?)(?:\n#{1,3}\s|\z)").unwrap();
    re.captures(markdown)
        .map(|cap| cap[1].trim().to_string())
        .filter(|s| !s.is_empty())
}

pub fn parse_viral_events(markdown: &str) -> Vec<ViralEvent> {
    // Accept both "## Global Viral Events" and bare "Global Viral Events"
    let section_re =
        Regex::new(r"(?sm)^#{0,3}\s*Global Viral Events\s*\n(.*?)(?:\n#{1,2}\s|\z)").unwrap();
    let section = match section_re.captures(markdown) {
        Some(cap) => cap[1].to_string(),
        None => return Vec::new(),
    };

    let split_re = Regex::new(r"\n#{1,3}\s+").unwrap();
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
    let heading_re = Regex::new(r"^(?:#+\s*)?(\d+)\.\s*(.+)").unwrap();
    let plain_heading_re = Regex::new(r"^#+\s*(.+)").unwrap();

    let first_line = lines.first()?.trim();
    let (rank, headline) = if let Some(cap) = heading_re.captures(first_line) {
        (
            cap[1].parse::<i32>().unwrap_or(0),
            cap[2].trim().to_string(),
        )
    } else if let Some(cap) = plain_heading_re.captures(first_line) {
        (0, cap[1].trim().to_string())
    } else {
        (0, first_line.to_string())
    };

    if headline.is_empty() {
        return None;
    }

    let field_re = Regex::new(r#"-\s*\*\*(.+?)\*\*:\s*(.+)"#).unwrap();
    let mut fields = std::collections::HashMap::new();
    let mut what_changed = Vec::new();
    let mut in_what_changed = false;

    for line in &lines[1..] {
        let stripped = line.trim();
        if stripped.starts_with("- **What Changed**") {
            in_what_changed = true;
            continue;
        }
        if in_what_changed {
            if stripped.starts_with("- **") {
                in_what_changed = false;
            } else if stripped.starts_with("- ") {
                what_changed.push(stripped[2..].trim().to_string());
                continue;
            } else if !stripped.is_empty() {
                continue;
            } else {
                in_what_changed = false;
            }
        }
        if let Some(cap) = field_re.captures(stripped) {
            fields.insert(cap[1].to_lowercase(), cap[2].trim().to_string());
        }
    }

    let category = match fields.get("category").map(|s| s.as_str()) {
        Some("model") => EventCategory::Model,
        Some("infra") => EventCategory::Infra,
        Some("market") => EventCategory::Market,
        Some("regulation") => EventCategory::Regulation,
        Some("moat_attack") => EventCategory::MoatAttack,
        // Backward compat
        Some("product_launch") => EventCategory::ProductLaunch,
        Some("funding") => EventCategory::Funding,
        Some("partnership") => EventCategory::Partnership,
        Some("research") => EventCategory::Research,
        Some("open_source") => EventCategory::OpenSource,
        _ => EventCategory::Model,
    };

    let confidence = match fields.get("confidence").map(|s| s.as_str()) {
        Some("high") => ConfidenceLevel::High,
        Some("medium") => ConfidenceLevel::Medium,
        Some("low") => ConfidenceLevel::Low,
        _ => ConfidenceLevel::Medium,
    };

    let country_region = fields
        .get("country/region")
        .cloned()
        .unwrap_or_default();

    let why_included = fields
        .get("why included")
        .map(|s| parse_why_included_tags(s))
        .unwrap_or_default();

    let revenue_impact = fields
        .get("revenue impact")
        .cloned()
        .unwrap_or_default();

    let proof_pack = fields
        .get("proof pack")
        .cloned()
        .unwrap_or_default();

    // Backward compat: try old fields if new ones are missing
    let impact_rating = fields
        .get("impact rating")
        .and_then(|s| s.parse::<i32>().ok());

    let source = fields.get("source").cloned();
    let summary = fields.get("summary").cloned();

    Some(ViralEvent {
        headline,
        category,
        confidence,
        rank,
        country_region,
        why_included,
        revenue_impact,
        what_changed,
        proof_pack,
        impact_rating,
        source,
        summary,
    })
}

fn parse_why_included_tags(s: &str) -> Vec<WhyIncludedTag> {
    s.split(',')
        .filter_map(|tag| {
            let tag = tag.trim();
            // Accept both "A" and "A(Market reaction)" formats
            let letter = tag.chars().next()?;
            match letter {
                'A' => Some(WhyIncludedTag::A),
                'B' => Some(WhyIncludedTag::B),
                'C' => Some(WhyIncludedTag::C),
                'D' => Some(WhyIncludedTag::D),
                'E' => Some(WhyIncludedTag::E),
                'F' => Some(WhyIncludedTag::F),
                'G' => Some(WhyIncludedTag::G),
                _ => None,
            }
        })
        .collect()
}

pub fn parse_deep_dives(markdown: &str) -> Vec<DeepDive> {
    // Accept both "## Strategic Deep Dives" and bare heading, with optional suffix
    let section_re =
        Regex::new(r"(?sm)^#{0,3}\s*Strategic Deep Dives[^\n]*\n(.*?)(?:\n#{1,2}\s|\z)").unwrap();
    let section = match section_re.captures(markdown) {
        Some(cap) => cap[1].to_string(),
        None => return Vec::new(),
    };

    let split_re = Regex::new(r"\n#{1,3}\s+").unwrap();
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
    let heading_re = Regex::new(r"^(?:#+\s*)?(?:\d+\.\s*)?(.+)").unwrap();
    let title = heading_re
        .captures(lines.first()?.trim())?[1]
        .trim()
        .to_string();
    if title.is_empty() {
        return None;
    }

    // Extract named #### sections
    let mut sections = std::collections::HashMap::<String, String>::new();
    let mut current_section: Option<String> = None;
    let mut current_content = Vec::new();

    // Also collect old-format fields
    let field_re = Regex::new(r#"-\s*\*\*(.+?)\*\*:\s*(.+)"#).unwrap();
    let mut old_fields = std::collections::HashMap::new();
    let mut old_findings = Vec::new();
    let mut in_findings = false;

    for line in &lines[1..] {
        let stripped = line.trim();

        // Check for #### subsection header
        if stripped.starts_with("#### ") {
            // Save previous section
            if let Some(ref sec) = current_section {
                sections.insert(sec.clone(), current_content.join("\n").trim().to_string());
            }
            current_section = Some(stripped[5..].trim().to_lowercase());
            current_content.clear();
            continue;
        }

        if current_section.is_some() {
            current_content.push(stripped.to_string());
        } else {
            // Old format parsing
            if stripped.starts_with("- **Key Findings**") {
                in_findings = true;
                continue;
            }
            if in_findings && stripped.starts_with("- ") {
                old_findings.push(stripped[2..].trim().to_string());
                continue;
            }
            if !in_findings {
                if let Some(cap) = field_re.captures(stripped) {
                    old_fields.insert(cap[1].to_lowercase(), cap[2].trim().to_string());
                }
            }
        }
    }

    // Save last section
    if let Some(ref sec) = current_section {
        sections.insert(sec.clone(), current_content.join("\n").trim().to_string());
    }

    Some(DeepDive {
        title,
        what_happened: sections
            .get("what happened")
            .cloned()
            .unwrap_or_default(),
        why_it_matters: sections
            .get("why it matters mechanically")
            .or_else(|| sections.get("why it matters"))
            .cloned()
            .unwrap_or_default(),
        second_order_implications: sections
            .get("second-order implications")
            .or_else(|| sections.get("second order implications"))
            .cloned()
            .unwrap_or_default(),
        what_to_watch: sections
            .get("what to watch next week")
            .or_else(|| sections.get("what to watch"))
            .cloned()
            .unwrap_or_default(),
        // Backward compat
        priority: old_fields.get("priority").cloned(),
        summary: old_fields.get("summary").cloned(),
        key_findings: if old_findings.is_empty() {
            None
        } else {
            Some(old_findings)
        },
    })
}

pub fn parse_completeness_audit(markdown: &str) -> Option<CompletenessAudit> {
    // Accept both "## Completeness Audit" and bare heading
    let section_re =
        Regex::new(r"(?sm)^#{0,3}\s*Completeness Audit\s*\n(.*?)(?:\n#{1,2}\s|\z)").unwrap();
    let section = section_re.captures(markdown)?;
    let text = &section[1];

    let field_re = Regex::new(r#"-\s*\*\*(.+?)\*\*:\s*(.+)"#).unwrap();
    let mut fields = std::collections::HashMap::new();

    // Parse subsection lists
    let mut reuters_articles = Vec::new();
    let mut major_stock_moves = Vec::new();
    let mut vendor_coverage = Vec::new();
    let mut current_list: Option<&mut Vec<String>> = None;

    for line in text.lines() {
        let stripped = line.trim();
        if stripped.starts_with("- **Reuters Articles Reviewed**") {
            current_list = Some(&mut reuters_articles);
            continue;
        }
        if stripped.starts_with("- **Major Stock Moves**") {
            current_list = Some(&mut major_stock_moves);
            continue;
        }
        if stripped.starts_with("- **Vendor Coverage by Region**")
            || stripped.starts_with("- **Vendor Coverage By Region**")
        {
            current_list = Some(&mut vendor_coverage);
            continue;
        }

        if let Some(ref mut list) = current_list {
            if stripped.starts_with("- ") {
                list.push(stripped[2..].trim().to_string());
                continue;
            }
            if !stripped.is_empty() && !stripped.starts_with("- **") {
                continue;
            }
            current_list = None;
        }

        if let Some(cap) = field_re.captures(stripped) {
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
        reuters_articles,
        major_stock_moves,
        vendor_coverage,
    })
}
