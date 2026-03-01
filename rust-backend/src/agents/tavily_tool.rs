use rig::tool::Tool;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tavily::{SearchRequest, Tavily};

#[derive(Debug, thiserror::Error)]
pub enum TavilyError {
    #[error("Search failed: {0}")]
    SearchFailed(String),
}

#[derive(Deserialize, JsonSchema)]
pub struct TavilySearchArgs {
    /// The search query to execute
    pub query: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TavilySearchOutput(pub String);

impl std::fmt::Display for TavilySearchOutput {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

pub struct TavilySearchTool {
    client: Arc<Tavily>,
    api_key: String,
}

impl TavilySearchTool {
    pub fn new(client: Arc<Tavily>, api_key: String) -> Self {
        Self { client, api_key }
    }
}

impl Tool for TavilySearchTool {
    const NAME: &'static str = "internet_search";

    type Args = TavilySearchArgs;
    type Output = TavilySearchOutput;
    type Error = TavilyError;

    async fn definition(&self, _prompt: String) -> rig::completion::ToolDefinition {
        rig::completion::ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Search the internet for information on a given query.".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to execute"
                    }
                },
                "required": ["query"]
            }),
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let start = std::time::Instant::now();
        tracing::info!(query = %args.query, "Tavily search starting");

        let request = SearchRequest::new(&self.api_key, &args.query)
            .topic("news")
            .max_results(10)
            .days(1);

        let response = self
            .client
            .call(&request)
            .await
            .map_err(|e| {
                tracing::error!(
                    query = %args.query,
                    duration_s = start.elapsed().as_secs_f64(),
                    error = %e,
                    "Tavily search FAILED"
                );
                TavilyError::SearchFailed(e.to_string())
            })?;

        let mut results = Vec::new();
        for item in &response.results {
            tracing::debug!(query = %args.query, title = %item.title, url = %item.url, "Search result");
            results.push(format!(
                "## {}\n**URL:** {}\n\n{}\n\n---",
                item.title, item.url, item.content
            ));
        }

        let output = format!(
            "Found {} result(s) for '{}':\n\n{}",
            results.len(),
            args.query,
            results.join("\n\n")
        );

        tracing::info!(
            query = %args.query,
            results_count = results.len(),
            duration_s = start.elapsed().as_secs_f64(),
            "Tavily search completed"
        );

        Ok(TavilySearchOutput(output))
    }
}
