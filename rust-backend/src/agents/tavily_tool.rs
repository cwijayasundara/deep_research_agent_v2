use tavily::{SearchRequest, Tavily};

#[derive(Debug, thiserror::Error)]
pub enum TavilyError {
    #[error("Search failed: {0}")]
    SearchFailed(String),
}

/// Direct Tavily search without rig agent wrapper.
/// Used by the pipeline orchestrator for parallel searches.
pub async fn search(
    client: &Tavily,
    api_key: &str,
    query: &str,
) -> Result<String, TavilyError> {
    let start = std::time::Instant::now();
    tracing::info!(query = %query, "Tavily search starting");

    let request = SearchRequest::new(api_key, query)
        .topic("news")
        .max_results(10)
        .days(7);

    let response = client.call(&request).await.map_err(|e| {
        tracing::error!(
            query = %query,
            duration_s = start.elapsed().as_secs_f64(),
            error = %e,
            "Tavily search FAILED"
        );
        TavilyError::SearchFailed(e.to_string())
    })?;

    let mut results = Vec::new();
    for item in &response.results {
        tracing::debug!(query = %query, title = %item.title, url = %item.url, "Search result");
        results.push(format!(
            "## {}\n**URL:** {}\n\n{}\n\n---",
            item.title, item.url, item.content
        ));
    }

    let output = format!(
        "Found {} result(s) for '{}':\n\n{}",
        results.len(),
        query,
        results.join("\n\n")
    );

    tracing::info!(
        query = %query,
        results_count = results.len(),
        duration_s = start.elapsed().as_secs_f64(),
        "Tavily search completed"
    );

    Ok(output)
}
