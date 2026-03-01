use rig::client::CompletionClient;
use rig::completion::Prompt;
use std::sync::Arc;
use tavily::Tavily;

use super::prompts::{build_search_queries, build_synthesis_preamble, build_synthesis_prompt};
use super::tavily_tool;

pub async fn run_research(
    client: &rig::providers::openai::Client,
    model: &str,
    tavily: Arc<Tavily>,
    tavily_api_key: &str,
    date: &str,
) -> Result<String, String> {
    // --- Phase 1: Parallel Search (no LLM) ---
    let search_queries = build_search_queries(date);
    let total_queries = search_queries.len();

    tracing::info!(
        date = %date,
        query_count = total_queries,
        "Phase 1: Starting parallel Tavily searches"
    );

    let phase1_start = std::time::Instant::now();

    let search_futures = search_queries.into_iter().map(|(layer, query)| {
        let tavily = tavily.clone();
        let api_key = tavily_api_key.to_string();
        async move {
            match tavily_tool::search(&tavily, &api_key, &query).await {
                Ok(results) => (layer, results),
                Err(e) => {
                    tracing::warn!(
                        layer = %layer,
                        query = %query,
                        error = %e,
                        "Search failed, continuing with partial data"
                    );
                    (layer, format!("[Search failed for '{}': {}]", query, e))
                }
            }
        }
    });

    let search_results: Vec<(String, String)> =
        futures::future::join_all(search_futures).await;

    let successful = search_results
        .iter()
        .filter(|(_, r)| !r.starts_with("[Search failed"))
        .count();

    tracing::info!(
        date = %date,
        total = total_queries,
        successful = successful,
        failed = total_queries - successful,
        duration_s = phase1_start.elapsed().as_secs_f64(),
        "Phase 1: Parallel searches completed"
    );

    // --- Phase 2: Single LLM Synthesis ---
    tracing::info!(
        date = %date,
        model = %model,
        "Phase 2: Starting LLM synthesis"
    );

    let phase2_start = std::time::Instant::now();

    let preamble = build_synthesis_preamble();
    let synthesis_prompt = build_synthesis_prompt(date, &search_results);

    let agent = client
        .agent(model)
        .preamble(&preamble)
        .max_tokens(32768)
        .build();

    let result: String = agent
        .prompt(&synthesis_prompt)
        .max_turns(1)
        .await
        .map_err(|e| {
            tracing::error!(
                date = %date,
                duration_s = phase2_start.elapsed().as_secs_f64(),
                error = %e,
                "Phase 2: LLM synthesis FAILED"
            );
            e.to_string()
        })?;

    let total_duration =
        phase1_start.elapsed().as_secs_f64();

    tracing::info!(
        date = %date,
        phase1_duration_s = (phase2_start - phase1_start).as_secs_f64(),
        phase2_duration_s = phase2_start.elapsed().as_secs_f64(),
        total_duration_s = total_duration,
        output_len = result.len(),
        "Pipeline completed"
    );

    Ok(result)
}
