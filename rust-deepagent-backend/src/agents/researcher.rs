use std::sync::Arc;

use rig::client::CompletionClient;
use rig::completion::message::{AssistantContent, Message};
use rig::completion::{Prompt, PromptError};
use rig::providers::openai;
use rig::tools::think::ThinkTool;
use tavily::Tavily;

use super::hooks::ResearcherHook;
use super::prompts::LayerConfig;
use super::tavily_tool::TavilySearchTool;

const TURNS_PER_SEGMENT: usize = 10;
const MAX_SEGMENTS: usize = 3;

#[derive(Debug)]
pub enum ResearchStatus {
    Completed,
    Partial,
    Failed,
}

impl std::fmt::Display for ResearchStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ResearchStatus::Completed => write!(f, "completed"),
            ResearchStatus::Partial => write!(f, "partial"),
            ResearchStatus::Failed => write!(f, "failed"),
        }
    }
}

pub struct ResearchResult {
    pub layer_name: String,
    pub status: ResearchStatus,
    pub findings: String,
}

impl ResearchResult {
    fn completed(layer_name: String, findings: String) -> Self {
        Self {
            layer_name,
            status: ResearchStatus::Completed,
            findings,
        }
    }

    fn partial(layer_name: String, findings: String) -> Self {
        Self {
            layer_name,
            status: ResearchStatus::Partial,
            findings,
        }
    }

    fn failed(layer_name: String, error: String) -> Self {
        Self {
            layer_name,
            status: ResearchStatus::Failed,
            findings: format!("[Research failed: {}]", error),
        }
    }

    pub fn failed_timeout(layer_name: String) -> Self {
        Self {
            layer_name,
            status: ResearchStatus::Failed,
            findings: "[Research timed out after 300 seconds]".to_string(),
        }
    }
}

pub struct Researcher {
    pub layer: LayerConfig,
    pub openai_client: openai::Client,
    pub model: String,
    pub tavily_client: Arc<Tavily>,
    pub tavily_api_key: String,
}

impl Researcher {
    pub async fn run(self) -> ResearchResult {
        let layer_name = self.layer.name.clone();
        tracing::info!(layer = %layer_name, "Researcher starting");

        let tavily_tool =
            TavilySearchTool::new(self.tavily_client.clone(), self.tavily_api_key.clone());
        let hook = ResearcherHook::with_default_limit(layer_name.clone());

        let agent = self
            .openai_client
            .agent(&self.model)
            .preamble(&self.layer.preamble)
            .hook(hook)
            .max_tokens(16384)
            .tool(tavily_tool)
            .tool(ThinkTool)
            .build();

        let mut history: Vec<Message> = Vec::new();
        let mut prompt = self.layer.initial_query.clone();
        let mut accumulated = String::new();

        for segment in 0..MAX_SEGMENTS {
            tracing::info!(
                layer = %layer_name,
                segment = segment,
                max_segments = MAX_SEGMENTS,
                "Researcher segment starting"
            );

            let result: Result<String, PromptError> = agent
                .prompt(&prompt)
                .with_history(&mut history)
                .max_turns(TURNS_PER_SEGMENT)
                .await;

            match result {
                Ok(response) => {
                    tracing::info!(
                        layer = %layer_name,
                        segment = segment,
                        response_len = response.len(),
                        "Researcher segment completed successfully"
                    );
                    let combined = if accumulated.is_empty() {
                        response
                    } else {
                        format!("{}\n\n{}", accumulated, response)
                    };
                    return ResearchResult::completed(layer_name, combined);
                }
                Err(rig::completion::PromptError::MaxTurnsError {
                    chat_history, ..
                }) => {
                    let partial = extract_findings_from_history(&chat_history);
                    tracing::warn!(
                        layer = %layer_name,
                        segment = segment,
                        partial_len = partial.len(),
                        "MaxTurnsError: extracting partial findings"
                    );

                    if !partial.is_empty() {
                        if accumulated.is_empty() {
                            accumulated = partial;
                        } else {
                            accumulated = format!("{}\n\n{}", accumulated, partial);
                        }
                    }

                    if segment + 1 >= MAX_SEGMENTS {
                        tracing::info!(
                            layer = %layer_name,
                            "Max segments reached, returning partial findings"
                        );
                        return ResearchResult::partial(layer_name, accumulated);
                    }

                    // Clear history and continue with accumulated context
                    history.clear();
                    prompt = format!(
                        "Continue your research. Here are your findings so far:\n\n{}\n\n\
                         Search for more information to fill gaps. When done, write a final \
                         comprehensive summary of ALL findings.",
                        accumulated
                    );
                }
                Err(rig::completion::PromptError::PromptCancelled {
                    chat_history,
                    reason,
                    ..
                }) => {
                    let partial = extract_findings_from_history(&chat_history);
                    tracing::info!(
                        layer = %layer_name,
                        reason = %reason,
                        partial_len = partial.len(),
                        "PromptCancelled (hook terminated): extracting partial findings"
                    );

                    let combined = if accumulated.is_empty() {
                        partial
                    } else {
                        format!("{}\n\n{}", accumulated, partial)
                    };
                    return ResearchResult::partial(layer_name, combined);
                }
                Err(e) => {
                    tracing::error!(
                        layer = %layer_name,
                        segment = segment,
                        error = %e,
                        "Researcher segment FAILED with unexpected error"
                    );
                    return ResearchResult::failed(layer_name, e.to_string());
                }
            }
        }

        // Should not reach here, but handle gracefully
        ResearchResult::partial(layer_name, accumulated)
    }
}

fn extract_findings_from_history(history: &[Message]) -> String {
    let mut findings = Vec::new();

    for message in history {
        if let Message::Assistant { content, .. } = message {
            for item in content.iter() {
                if let AssistantContent::Text(text) = item {
                    let text_str = text.text.trim();
                    if !text_str.is_empty() {
                        findings.push(text_str.to_string());
                    }
                }
            }
        }
    }

    findings.join("\n\n")
}
