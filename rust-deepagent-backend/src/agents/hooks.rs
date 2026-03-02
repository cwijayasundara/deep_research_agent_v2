use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use rig::agent::{HookAction, PromptHook, ToolCallHookAction};
use rig::completion::CompletionModel;
use rig::completion::message::Message;

const MAX_SEARCH_CALLS: usize = 10;

#[derive(Clone)]
pub struct ResearcherHook {
    layer_name: String,
    search_count: Arc<AtomicUsize>,
    max_searches: usize,
}

impl ResearcherHook {
    pub fn new(layer_name: String, max_searches: usize) -> Self {
        Self {
            layer_name,
            search_count: Arc::new(AtomicUsize::new(0)),
            max_searches,
        }
    }

    pub fn with_default_limit(layer_name: String) -> Self {
        Self::new(layer_name, MAX_SEARCH_CALLS)
    }
}

impl<M: CompletionModel> PromptHook<M> for ResearcherHook {
    async fn on_tool_call(
        &self,
        tool_name: &str,
        _tool_call_id: Option<String>,
        _internal_call_id: &str,
        args: &str,
    ) -> ToolCallHookAction {
        if tool_name == "tavily_search" {
            let count = self.search_count.fetch_add(1, Ordering::SeqCst) + 1;
            tracing::info!(
                layer = %self.layer_name,
                search_count = count,
                max = self.max_searches,
                args = %args,
                "ResearcherHook: tavily_search call #{count}"
            );

            if count > self.max_searches {
                tracing::warn!(
                    layer = %self.layer_name,
                    "ResearcherHook: search budget exhausted ({count} > {}), terminating",
                    self.max_searches
                );
                return ToolCallHookAction::terminate(format!(
                    "Search budget exhausted for {}: {count} searches exceeded limit of {}",
                    self.layer_name, self.max_searches
                ));
            }
        }

        ToolCallHookAction::cont()
    }

    async fn on_tool_result(
        &self,
        tool_name: &str,
        _tool_call_id: Option<String>,
        _internal_call_id: &str,
        _args: &str,
        result: &str,
    ) -> HookAction {
        tracing::debug!(
            layer = %self.layer_name,
            tool = %tool_name,
            result_len = result.len(),
            "ResearcherHook: tool result received"
        );
        HookAction::cont()
    }

    async fn on_completion_call(
        &self,
        _prompt: &Message,
        _history: &[Message],
    ) -> HookAction {
        HookAction::cont()
    }

    async fn on_completion_response(
        &self,
        _prompt: &Message,
        _response: &rig::completion::CompletionResponse<M::Response>,
    ) -> HookAction {
        HookAction::cont()
    }
}
