use std::sync::Arc;

use rig::completion::request::ToolDefinition;
use rig::tool::Tool;
use serde::Deserialize;
use tavily::{SearchRequest, Tavily};

#[derive(Debug, thiserror::Error)]
pub enum TavilyToolError {
    #[error("Search failed: {0}")]
    SearchFailed(String),
}

#[derive(Deserialize)]
pub struct TavilySearchArgs {
    pub query: String,
}

#[derive(Clone)]
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
    const NAME: &'static str = "tavily_search";

    type Error = TavilyToolError;
    type Args = TavilySearchArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Search the web for recent news and information using Tavily. \
                          Returns formatted search results with titles, URLs, and content snippets. \
                          Use this to find current events, news articles, and factual information."
                .to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to execute. Be specific and include relevant keywords."
                    }
                },
                "required": ["query"]
            }),
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let start = std::time::Instant::now();
        tracing::info!(query = %args.query, "TavilySearchTool: search starting");

        let request = SearchRequest::new(&self.api_key, &args.query)
            .topic("news")
            .max_results(10)
            .days(7);

        let response = self.client.call(&request).await.map_err(|e| {
            tracing::error!(
                query = %args.query,
                duration_s = start.elapsed().as_secs_f64(),
                error = %e,
                "TavilySearchTool: search FAILED"
            );
            TavilyToolError::SearchFailed(e.to_string())
        })?;

        let mut results = Vec::new();
        for item in &response.results {
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
            "TavilySearchTool: search completed"
        );

        Ok(output)
    }
}
