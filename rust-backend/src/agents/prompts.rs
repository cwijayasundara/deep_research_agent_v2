pub fn build_synthesis_preamble() -> String {
    r#"You are a Global AI Viral Intelligence Tracker v4.0 — a synthesis engine.

You will receive pre-gathered search results organized by 5 detection layers.
Your job: analyze these results and produce a structured weekly AI intelligence report.

## Report Format (MANDATORY)

## TL;DR
- <3-5 bullet executive summary of the week's most significant AI developments>

## Global Viral Events
### 1. Event Headline
- **Category**: <model|infra|market|regulation|moat_attack>
- **Country/Region**: <country or region where the event originated>
- **Confidence**: <high|medium|low>
- **Why Included**: <comma-separated tags from: A(Market reaction), B(Narrative dominance), C(Workflow shift), D(Competitive wedge), E(Regulatory trigger), F(Revenue-pool threat), G(Sovereign/geopolitical shift)>
- **Revenue Impact**: <1-2 sentence assessment of revenue/market impact>
- **What Changed**
  - <bullet 1: specific change>
  - <bullet 2: specific change>
- **Proof Pack**: <Primary source URL> → <Secondary source URL>

### 2. Next Event Headline
(same fields)

(Repeat numbered ### blocks for each event — produce 10-20 ranked events. The number IS the rank.)

## Strategic Deep Dives

TOP 3 EVENTS ONLY. Each deep dive has exactly 4 sections:

### <Deep Dive Title — must match a top-3 Global Viral Event>

#### What Happened
<detailed paragraph explaining the event>

#### Why It Matters Mechanically
<paragraph explaining market/technical mechanisms and direct consequences>

#### Second-Order Implications
<paragraph on cascading effects, strategic shifts, and longer-term consequences>

#### What to Watch Next Week
<paragraph on leading indicators, upcoming decisions, and signals to monitor>

(Repeat ### block for the TOP 3 events only)

## Completeness Audit
- **Verified Signals**: <number>
- **Sources Checked**: <number>
- **Confidence Score**: <0.0-1.0>
- **Gaps**: <comma-separated list>
- **Reuters Articles Reviewed**
  - <article title or description>
  - <article title or description>
- **Major Stock Moves**
  - <ticker/company: move description>
  - <ticker/company: move description>
- **Vendor Coverage by Region**
  - <region: vendors covered>
  - <region: vendors covered>

## Important Rules
- ONLY use information from the provided search results
- Do NOT invent events or sources not present in the results
- If a layer returned few/no results, note this in the Completeness Audit gaps
- ONLY include events from the last 7 days
- Rank events by significance (rank 1 = most important)
- Deep dives: TOP 3 ONLY
- You MUST return 10-20 ranked Global Viral Events with all required fields
  (category, country/region, confidence, why_included, revenue_impact, what_changed, proof_pack)
- You MUST produce Strategic Deep Dives for the TOP 3 events only, each with 4 sections
  (what_happened, why_it_matters, second_order_implications, what_to_watch)
"#
    .to_string()
}

pub fn build_synthesis_prompt(date: &str, search_results: &[(String, String)]) -> String {
    let mut layer_sections = String::new();

    // Group results by layer name
    let layer_names = [
        "Layer 1: Vendor Sweep",
        "Layer 2: Market Sweep",
        "Layer 3: Moat-Attack Radar",
        "Layer 4: Sovereign/Geopolitical Sweep",
        "Layer 5: Narrative Velocity",
    ];

    for layer_name in &layer_names {
        layer_sections.push_str(&format!("\n## {}\n", layer_name));

        let layer_results: Vec<&str> = search_results
            .iter()
            .filter(|(layer, _)| layer == *layer_name)
            .map(|(_, results)| results.as_str())
            .collect();

        if layer_results.is_empty() {
            layer_sections.push_str("[No search results available for this layer]\n");
        } else {
            for result in layer_results {
                layer_sections.push_str(result);
                layer_sections.push('\n');
            }
        }
    }

    format!(
        "Produce a comprehensive weekly AI intelligence report for the 7 days ending {date}.\n\
         Today's date is {date}.\n\n\
         Below are search results from 5 detection layers. Analyze them and produce\n\
         the report following the format in your instructions.\n\
         {layer_sections}"
    )
}

/// Returns predefined search queries for each detection layer.
/// Each entry is (layer_name, query_string).
pub fn build_search_queries(date: &str) -> Vec<(String, String)> {
    vec![
        // Layer 1: Vendor Sweep (3 queries)
        (
            "Layer 1: Vendor Sweep".to_string(),
            format!("OpenAI Anthropic Google DeepMind Meta AI announcements releases week of {date}"),
        ),
        (
            "Layer 1: Vendor Sweep".to_string(),
            format!("Mistral xAI Cohere Inflection Stability AI model launch {date}"),
        ),
        (
            "Layer 1: Vendor Sweep".to_string(),
            format!("NVIDIA AMD Microsoft Amazon AWS AI chip infrastructure {date}"),
        ),
        // Layer 2: Market Sweep (2 queries)
        (
            "Layer 2: Market Sweep".to_string(),
            format!("AI startup funding round IPO filing stock move {date}"),
        ),
        (
            "Layer 2: Market Sweep".to_string(),
            format!("AI company acquisition merger partnership deal {date}"),
        ),
        // Layer 3: Moat-Attack Radar (2 queries)
        (
            "Layer 3: Moat-Attack Radar".to_string(),
            format!("open source AI model release benchmark state of the art {date}"),
        ),
        (
            "Layer 3: Moat-Attack Radar".to_string(),
            format!("AI developer tool framework launch commoditization {date}"),
        ),
        // Layer 4: Sovereign/Geopolitical Sweep (2 queries)
        (
            "Layer 4: Sovereign/Geopolitical Sweep".to_string(),
            format!("AI regulation executive order export control government policy {date}"),
        ),
        (
            "Layer 4: Sovereign/Geopolitical Sweep".to_string(),
            format!("sovereign AI fund international AI agreement geopolitical {date}"),
        ),
        // Layer 5: Narrative Velocity (2 queries)
        (
            "Layer 5: Narrative Velocity".to_string(),
            format!("viral AI discussion trending AI social media debate {date}"),
        ),
        (
            "Layer 5: Narrative Velocity".to_string(),
            format!("AI safety workforce impact opinion piece cultural {date}"),
        ),
    ]
}
