use rig::client::CompletionClient;
use rig::completion::Prompt;
use std::sync::Arc;
use tavily::Tavily;

use super::prompts::{build_orchestrator_preamble, build_orchestrator_query};
use super::researcher_tool::ResearcherTool;

pub async fn run_research(
    client: &rig::providers::openai::Client,
    model: &str,
    tavily: Arc<Tavily>,
    tavily_api_key: &str,
    date: &str,
) -> Result<String, String> {
    let researcher_tool = ResearcherTool::new(
        Arc::new(client.clone()),
        model.to_string(),
        tavily,
        tavily_api_key.to_string(),
        date.to_string(),
    );

    let preamble = build_orchestrator_preamble(date);
    let agent = client
        .agent(model)
        .preamble(&preamble)
        .tool(researcher_tool)
        .max_tokens(16384)
        .build();

    let query = build_orchestrator_query(date);
    tracing::info!(
        date = %date,
        model = %model,
        max_turns = 10,
        "Invoking orchestrator agent"
    );

    let start = std::time::Instant::now();
    let result: String = match agent.prompt(&query).max_turns(10).await {
        Ok(output) => output,
        Err(e) => {
            let err_str = e.to_string();
            if err_str.contains("usage policy")
                || err_str.contains("content_filter")
                || err_str.contains("flagged")
            {
                tracing::warn!(
                    date = %date,
                    duration_s = start.elapsed().as_secs_f64(),
                    error = %err_str,
                    "Orchestrator hit content filter, returning partial result"
                );
                format!(
                    "## TL;DR\n- Report generation was partially blocked by the model's \
                     content safety filter. Some research topics were skipped.\n\n\
                     ## Completeness Audit\n- **Verified Signals**: 0\n\
                     - **Sources Checked**: 0\n- **Confidence Score**: 0.0\n\
                     - **Gaps**: Content filter prevented complete research"
                )
            } else {
                tracing::error!(
                    date = %date,
                    duration_s = start.elapsed().as_secs_f64(),
                    error = %err_str,
                    "Orchestrator agent FAILED"
                );
                return Err(err_str);
            }
        }
    };

    tracing::info!(
        date = %date,
        duration_s = start.elapsed().as_secs_f64(),
        output_len = result.len(),
        "Orchestrator agent completed"
    );
    Ok(result)
}
