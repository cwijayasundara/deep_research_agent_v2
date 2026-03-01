use rig::client::CompletionClient;
use rig::completion::Prompt;
use rig::tool::Tool;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tavily::Tavily;

use super::prompts::build_researcher_preamble;
use super::tavily_tool::TavilySearchTool;

#[derive(Debug, thiserror::Error)]
pub enum ResearcherError {
    #[error("Research failed: {0}")]
    Failed(String),
}

#[derive(Deserialize, JsonSchema)]
pub struct ResearcherArgs {
    /// Description of the research task to perform
    pub task_description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearcherOutput(pub String);

impl std::fmt::Display for ResearcherOutput {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

pub struct ResearcherTool {
    openai_client: Arc<rig::providers::openai::Client>,
    model: String,
    tavily_client: Arc<Tavily>,
    tavily_api_key: String,
    date: String,
}

impl ResearcherTool {
    pub fn new(
        openai_client: Arc<rig::providers::openai::Client>,
        model: String,
        tavily_client: Arc<Tavily>,
        tavily_api_key: String,
        date: String,
    ) -> Self {
        Self {
            openai_client,
            model,
            tavily_client,
            tavily_api_key,
            date,
        }
    }
}

impl Tool for ResearcherTool {
    const NAME: &'static str = "research_agent";

    type Args = ResearcherArgs;
    type Output = ResearcherOutput;
    type Error = ResearcherError;

    async fn definition(&self, _prompt: String) -> rig::completion::ToolDefinition {
        rig::completion::ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Delegate research to the sub-agent researcher. Only give this researcher one topic at a time.".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "task_description": {
                        "type": "string",
                        "description": "Description of the specific research task to perform"
                    }
                },
                "required": ["task_description"]
            }),
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let start = std::time::Instant::now();
        tracing::info!(
            task = %args.task_description,
            model = %self.model,
            max_turns = 3,
            "Researcher sub-agent spawning"
        );

        // Fresh agent per call = context isolation (same as DeepAgents)
        let search_tool = TavilySearchTool::new(
            self.tavily_client.clone(),
            self.tavily_api_key.clone(),
        );

        let preamble = build_researcher_preamble(&self.date);
        let agent = self
            .openai_client
            .agent(&self.model)
            .preamble(&preamble)
            .tool(search_tool)
            .max_tokens(4096)
            .build();

        let result: String = match agent
            .prompt(&args.task_description)
            .max_turns(3)
            .await
        {
            Ok(output) => output,
            Err(e) => {
                let err_str = e.to_string();
                // Recover from content filter rejections instead of crashing
                if err_str.contains("usage policy")
                    || err_str.contains("content_filter")
                    || err_str.contains("flagged")
                {
                    tracing::warn!(
                        task = %args.task_description,
                        duration_s = start.elapsed().as_secs_f64(),
                        error = %err_str,
                        "Researcher sub-agent hit content filter, returning safe fallback"
                    );
                    format!(
                        "[Content filter triggered — skipping research on '{}'. \
                         The search results contained content flagged by the model's \
                         safety filter. Please continue with other topics.]",
                        args.task_description
                    )
                } else {
                    tracing::error!(
                        task = %args.task_description,
                        duration_s = start.elapsed().as_secs_f64(),
                        error = %err_str,
                        "Researcher sub-agent FAILED"
                    );
                    return Err(ResearcherError::Failed(err_str));
                }
            }
        };

        tracing::info!(
            task = %args.task_description,
            duration_s = start.elapsed().as_secs_f64(),
            output_len = result.len(),
            "Researcher sub-agent completed"
        );

        Ok(ResearcherOutput(result))
    }
}
