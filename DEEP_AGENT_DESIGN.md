# Building a Deep Research Agent in Rust with Rig, Tokio & Axum

**How we built a fault-tolerant, multi-agent AI research system that runs 5 parallel researcher agents, recovers from failures gracefully, and synthesizes structured intelligence reports — all in Rust.**

---

## The Problem

We needed an AI agent that could autonomously research a broad topic across multiple dimensions — vendor announcements, market movements, geopolitical signals, competitive moat attacks, and narrative trends — then synthesize everything into a single structured report with ranked events, deep dives, and a completeness audit.

A single LLM call can't do this well. The search space is too large, context windows get polluted, and a failure at any point means starting over. We needed **parallel, fault-tolerant, multi-agent orchestration**.

## Why Rust?

Three reasons:

1. **Tokio gives us lightweight concurrency for free.** Spawning 5 researcher agents as async tasks costs near-zero overhead compared to Python's threading or multiprocessing.
2. **Rig** (a Rust-native LLM framework) gives us typed tool calling, agent builder patterns, and prompt hooks — everything we need to build agentic loops with compile-time safety.
3. **Axum** integrates natively with Tokio, giving us a production-grade HTTP server with zero glue code.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Axum HTTP Server                  │
│              POST /api/reports/trigger              │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  Orchestrator  │
              │  (spawns tasks)│
              └───────┬────────┘
                      │
        ┌─────────────┼─────────────────┐
        │  tokio::spawn × 5             │
        │  + mpsc::channel              │
        ▼             ▼                 ▼
   ┌──────────┐ ┌──────────┐     ┌──────────┐
   │Researcher│ │Researcher│ ... │Researcher│
   │ Layer 1  │ │ Layer 2  │     │ Layer 5  │
   │(Vendor)  │ │(Market)  │     │(Narrative│
   └────┬─────┘ └────┬─────┘     └────┬─────┘
        │             │                │
        │  Each agent has:             │
        │  • TavilySearchTool          │
        │  • ThinkTool                 │
        │  • ResearcherHook (budget)   │
        │  • 3 segments × 10 turns     │
        │             │                │
        └─────────────┼────────────────┘
                      │ mpsc channel
                      ▼
              ┌────────────────┐
              │   Synthesizer  │
              │  (single LLM)  │
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │  Parsed Report │
              │  → SQLite      │
              └────────────────┘
```

## The Core Innovation: Agent-as-Task (not Agent-as-Tool)

This was our biggest design decision — and we got it wrong the first time.

### What Failed: Agent-as-Tool

Our first attempt used rig's tool-calling mechanism to run researchers **as tools** called by an orchestrator agent:

```
Orchestrator Agent
  └─ calls ResearcherTool (which internally runs an agent loop)
       └─ Researcher hits 10-turn limit
            └─ rig returns PromptError::MaxTurnsError
                 └─ Tool result = Error. All intermediate findings: GONE.
```

When a researcher agent hit the turn limit, rig propagated the error upward. The orchestrator only saw the error — not the 8 successful search results the researcher had already accumulated. **Complete data loss.**

### What Worked: Agent-as-Task

We decoupled researchers from the orchestrator entirely. Each researcher is a **standalone Tokio task** that owns its own agent loop, collects its own results, and sends them back via an async channel:

```rust
let (tx, mut rx) = mpsc::channel::<ResearchResult>(5);

for layer in research_layers {
    let tx = tx.clone();
    tokio::spawn(async move {
        let researcher = Researcher::new(layer, client, tavily);
        let result = tokio::time::timeout(
            Duration::from_secs(300),
            researcher.run()
        ).await.unwrap_or_else(|_| ResearchResult::failed_timeout(&layer.name));

        let _ = tx.send(result).await;
    });
}

// Collect results — order doesn't matter
drop(tx);
let mut results = Vec::new();
while let Some(result) = rx.recv().await {
    results.push(result);
}
```

**Result**: Even if a researcher times out, hits turn limits, or encounters API errors — we always get *something* back. Partial results are better than no results.

## Segmented Agent Loops: Surviving Turn Limits

Each researcher runs a **segmented loop** — 3 segments of 10 turns each. When a segment hits `MaxTurnsError`, instead of failing, we extract findings from the chat history and continue:

```rust
impl Researcher {
    pub async fn run(self) -> ResearchResult {
        let mut accumulated_findings = String::new();

        for segment in 0..3 {
            let prompt = if segment == 0 {
                self.layer.initial_query.clone()
            } else {
                format!(
                    "Continue researching. Previous findings:\n{}\n\nDig deeper.",
                    accumulated_findings
                )
            };

            match agent.prompt(&prompt).with_history(&mut history).max_turns(10).await {
                Ok(response) => {
                    // Natural completion — return full result
                    return ResearchResult::completed(&self.layer.name, &response);
                }
                Err(PromptError::MaxTurnsError { chat_history, .. }) => {
                    // Extract what we found so far
                    let partial = extract_findings_from_history(&chat_history);
                    accumulated_findings.push_str(&partial);
                    history.clear(); // Reset for next segment
                }
                Err(PromptError::PromptCancelled { chat_history, .. }) => {
                    // Hook terminated (search budget exhausted)
                    let partial = extract_findings_from_history(&chat_history);
                    return ResearchResult::partial(&self.layer.name, &partial);
                }
                Err(e) => return ResearchResult::failed(&self.layer.name, &e.to_string()),
            }
        }

        ResearchResult::partial(&self.layer.name, &accumulated_findings)
    }
}
```

**3 segments × 10 turns = up to 30 agentic interactions per researcher**, with graceful recovery at every boundary.

## Search Budget Enforcement via Prompt Hooks

Each researcher gets a hard limit on Tavily API calls (default: 7). We enforce this with rig's `PromptHook` trait:

```rust
pub struct ResearcherHook {
    layer_name: String,
    search_count: Arc<AtomicUsize>,
    max_searches: usize,
}

impl<M: CompletionModel> PromptHook<M> for ResearcherHook {
    async fn on_tool_call(&self, tool_name: &str, _args: &str) -> ToolCallHookAction {
        if tool_name == "tavily_search" {
            let count = self.search_count.fetch_add(1, Ordering::SeqCst) + 1;
            if count > self.max_searches {
                return ToolCallHookAction::terminate(
                    format!("Search budget exhausted ({}/{})", count, self.max_searches)
                );
            }
        }
        ToolCallHookAction::cont()
    }
}
```

When the budget is exhausted, the hook triggers `PromptCancelled` — which our segmented loop catches and converts to a partial result. **No data loss, no runaway API costs.**

## Tool Implementation: TavilySearchTool

Rig's `Tool` trait gives us type-safe function calling with zero boilerplate:

```rust
#[derive(Deserialize)]
pub struct TavilySearchArgs {
    pub query: String,
}

impl Tool for TavilySearchTool {
    const NAME: &'static str = "tavily_search";
    type Args = TavilySearchArgs;
    type Output = String;

    async fn call(&self, args: Self::Args) -> Result<Self::Output, ToolError> {
        let request = SearchRequest::new(&self.api_key, &args.query)
            .topic("news")
            .max_results(10)
            .days(7);

        let response = self.client.call(&request).await?;

        let output = response.results.iter()
            .map(|r| format!("**{}**\n{}\n{}", r.title, r.url, r.content))
            .collect::<Vec<_>>()
            .join("\n\n");

        Ok(format!("Found {} results:\n\n{}", response.results.len(), output))
    }
}
```

The LLM sees a JSON schema for `tavily_search(query: string)`, calls it as needed, and gets formatted results back — all type-checked at compile time.

## Two-Phase Pipeline

### Phase 1: Parallel Research (~60–120s)
- 5 Tokio tasks run concurrently
- Each makes 3–7 Tavily searches
- Results collected via `mpsc::channel`
- Timeouts enforced at 300 seconds per task

### Phase 2: Single-Shot Synthesis (~30–60s)
- All researcher findings (complete, partial, or failed) are combined
- A single LLM call with a detailed synthesis prompt produces:
  - **TL;DR** — 3–5 bullet executive summary
  - **10–20 Ranked Viral Events** — with category, confidence, proof pack
  - **3 Strategic Deep Dives** — what happened, why it matters, what to watch
  - **Completeness Audit** — sources checked, confidence score, gaps identified

**Total cost: 6 LLM calls** (5 researchers + 1 synthesizer). An earlier architecture with sub-orchestrators required 11+.

## Async Trigger Pattern

Research takes 2–3 minutes. We don't make the client wait:

```rust
pub async fn trigger_research(state: AppState) -> Result<Json<ResearchReport>> {
    let report = ResearchReport::new_running(report_id);

    // Return immediately
    tokio::spawn(async move {
        let result = run_daily_research(&date, &state).await;
        state.repo.save_report(&result).await.ok();
    });

    Ok(Json(report)) // status: "running"
}
```

The frontend polls `GET /api/reports/{id}` until the status flips to `completed`. Simple, stateless, and horizontally scalable.

## What We Learned

| Lesson | Detail |
|--------|--------|
| **Agent-as-Tool is fragile** | Turn limits and errors destroy accumulated context. Decouple agents from the orchestrator. |
| **Segmented loops > long loops** | Breaking a 30-turn loop into 3×10 segments with history extraction gives natural recovery points. |
| **Prompt hooks are control planes** | Budget enforcement, monitoring, and early termination — without touching the agent loop logic. |
| **Tokio tasks are the right abstraction** | Lightweight, cancellable, timeout-friendly. Each researcher is fully independent. |
| **Partial results beat no results** | A researcher that found 6/10 things is still valuable. Design for graceful degradation. |

## Tech Stack

| Component | Choice |
|-----------|--------|
| Language | Rust |
| Async Runtime | Tokio |
| Web Framework | Axum |
| LLM Framework | Rig 0.31 |
| LLM Provider | OpenAI (gpt-4o) |
| Search API | Tavily |
| Database | SQLite (tokio-rusqlite) |
| Auth | JWT (HS256) |

## The Result

A production-grade research agent that:
- Runs 5 specialized researchers **in parallel**
- Recovers from failures **without data loss**
- Enforces API budgets **at the hook level**
- Produces structured, parseable reports
- Costs **6 LLM calls** per research run
- Completes in **2–3 minutes** end-to-end

All in ~1,500 lines of Rust.

---

*Built with Rig, Tokio, and a healthy respect for `PromptError::MaxTurnsError`.*
