use std::sync::Arc;
use std::time::Duration;

use rig::client::CompletionClient;
use rig::completion::{Prompt, PromptError};
use rig::providers::openai;
use tavily::Tavily;
use tokio::sync::mpsc;

use super::prompts::{build_layer_configs, build_synthesis_preamble, build_synthesis_prompt};
use super::researcher::{ResearchResult, Researcher};

pub async fn run_deep_research(
    client: &openai::Client,
    model: &str,
    tavily: Arc<Tavily>,
    tavily_api_key: &str,
    date: &str,
) -> Result<String, String> {
    let total_start = std::time::Instant::now();

    // --- Phase 1: Spawn 5 Researcher Tokio Tasks (parallel) ---
    let layers = build_layer_configs(date);
    let layer_count = layers.len();
    let (tx, mut rx) = mpsc::channel::<ResearchResult>(layer_count);

    tracing::info!(
        date = %date,
        layer_count = layer_count,
        "Phase 1: Spawning {} researcher agents",
        layer_count
    );

    for layer in layers {
        let tx = tx.clone();
        let layer_name = layer.name.clone();
        let openai_client = client.clone();
        let model = model.to_string();
        let tavily = tavily.clone();
        let api_key = tavily_api_key.to_string();

        tokio::spawn(async move {
            let researcher = Researcher {
                layer,
                openai_client,
                model,
                tavily_client: tavily,
                tavily_api_key: api_key,
            };

            let result =
                tokio::time::timeout(Duration::from_secs(300), researcher.run())
                    .await
                    .unwrap_or_else(|_| {
                        tracing::error!(
                            layer = %layer_name,
                            "Researcher timed out after 300s"
                        );
                        ResearchResult::failed_timeout(layer_name)
                    });

            if let Err(e) = tx.send(result).await {
                tracing::error!("Failed to send research result: {}", e);
            }
        });
    }

    // Drop sender so rx.recv() returns None when all tasks complete
    drop(tx);

    // Collect all results
    let mut results = Vec::new();
    while let Some(result) = rx.recv().await {
        tracing::info!(
            layer = %result.layer_name,
            status = %result.status,
            findings_len = result.findings.len(),
            "Received researcher result"
        );
        results.push(result);
    }

    let phase1_duration = total_start.elapsed().as_secs_f64();
    let successful = results
        .iter()
        .filter(|r| !matches!(r.status, super::researcher::ResearchStatus::Failed))
        .count();

    tracing::info!(
        date = %date,
        total = layer_count,
        successful = successful,
        failed = layer_count - successful,
        duration_s = phase1_duration,
        "Phase 1: All researchers completed"
    );

    // --- Phase 2: Single LLM Synthesis ---
    tracing::info!(
        date = %date,
        model = %model,
        "Phase 2: Starting LLM synthesis"
    );

    let phase2_start = std::time::Instant::now();

    // Build synthesis inputs: (layer_name, status, findings)
    let synthesis_inputs: Vec<(String, String, String)> = results
        .into_iter()
        .map(|r| (r.layer_name, r.status.to_string(), r.findings))
        .collect();

    let preamble = build_synthesis_preamble();
    let synthesis_prompt = build_synthesis_prompt(date, &synthesis_inputs);

    let agent = client
        .agent(model)
        .preamble(&preamble)
        .max_tokens(32768)
        .build();

    let report: String = agent
        .prompt(&synthesis_prompt)
        .max_turns(1)
        .await
        .map_err(|e: PromptError| {
            tracing::error!(
                date = %date,
                duration_s = phase2_start.elapsed().as_secs_f64(),
                error = %e,
                "Phase 2: LLM synthesis FAILED"
            );
            e.to_string()
        })?;

    let total_duration = total_start.elapsed().as_secs_f64();

    tracing::info!(
        date = %date,
        phase1_duration_s = phase1_duration,
        phase2_duration_s = phase2_start.elapsed().as_secs_f64(),
        total_duration_s = total_duration,
        output_len = report.len(),
        "Deep agent pipeline completed"
    );

    Ok(report)
}
