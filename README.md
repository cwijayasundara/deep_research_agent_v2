# Deep Research Agent v2 — Multi-Agent Architecture

A daily AI intelligence tracker powered by multi-agent research pipelines. Three backend options — Python/DeepAgents, Rust/Rig (direct pipeline), and Rust/Rig (deep agent) — serve the same Next.js frontend via an identical REST/JSON API.

## Architecture

```
                          ┌─────────────────────┐
                          │   Next.js Frontend   │
                          │  Backend Selector UI │
                          └─────────┬───────────┘
                                    │ REST/JSON API
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
 ┌────────────▼────────────┐ ┌──────▼───────────┐ ┌──────▼──────────────┐
 │  Python/DeepAgents      │ │  Rust/Rig        │ │  Rust Deep Agent    │
 │  FastAPI + LangGraph    │ │  Axum + Rig 0.31 │ │  Axum + Rig 0.31   │
 │  Port 8001              │ │  Port 8000       │ │  Port 8002          │
 │  (Sub-Agent Pattern)    │ │  (Direct Pipeline)│ │  (Agent-as-Task)   │
 └────────────┬────────────┘ └──────┬───────────┘ └──────┬──────────────┘
              │                     │                     │
 ┌────────────▼──────────┐ ┌───────▼──────────┐ ┌───────▼───────────────┐
 │ Orchestrator Agent    │ │ Search→Synthesize│ │ Orchestrator          │
 │  ├── think_tool       │ │ Pipeline         │ │  ├── Spawn 5 Tokio   │
 │  ├── Researcher ×5   │ │                  │ │  │   researcher tasks │
 │  └── Synthesize       │ │ Phase 1: 11     │ │  ├── mpsc::channel    │
 │                       │ │  Tavily queries  │ │  │   result collector │
 │ Researcher Sub-Agent  │ │  (no LLM)       │ │  └── LLM synthesis   │
 │  ├── Tavily search    │ │                  │ │                       │
 │  ├── think_tool       │ │ Phase 2: Single  │ │ Researcher Agent     │
 │  └── Cited findings   │ │  LLM synthesis   │ │  ├── TavilySearchTool│
 └───────────────────────┘ └──────────────────┘ │  ├── ThinkTool       │
                                                │  ├── PromptHook      │
                                                │  └── Segmented loop  │
                                                └───────────────────────┘
```

## Three Backend Approaches Compared

| Aspect | Rust Direct (port 8000) | Python DeepAgents (port 8001) | Rust Deep Agent (port 8002) |
|--------|------------------------|------------------------------|---------------------------|
| **Pattern** | Search → Synthesize | Agent-as-Tool sub-agents | Agent-as-Task (Tokio tasks) |
| **LLM calls** | 1 (synthesis only) | 6 (orchestrator + 5 researchers) | 6 (5 researchers + synthesis) |
| **Search decision** | Predetermined queries | LLM decides per layer | LLM decides per layer |
| **Fault tolerance** | N/A (no agent loops) | Framework-managed | Segmented loops + PromptHook |
| **Parallelism** | `futures::join_all` | Framework-managed | `tokio::spawn` + `mpsc` |
| **Partial results** | All-or-nothing per query | Framework-managed | Extracted from chat history |

## Rust Deep Agent Backend — Architecture Deep Dive

The deep agent backend (`rust-deepagent-backend/`) implements a **true multi-agent system** in Rust, inspired by the spacebot pattern. Unlike the original Rust backend's `Agent-as-Tool` approach (which failed due to `MaxTurnError` data loss), this uses `Agent-as-Task` — each researcher is an independent Tokio task communicating via async channels.

### Why Agent-as-Task Instead of Agent-as-Tool

The original Rust sub-agent attempt used rig-core's tool wrapper: the orchestrator called researchers as tools. This failed because:

1. **MaxTurnError data loss** — When a researcher hit its turn limit, ALL intermediate search results were lost
2. **No partial recovery** — The orchestrator received only an error, not the researcher's accumulated findings
3. **Tight coupling** — Researcher lifetime was bound to a single tool call

The deep agent backend solves all three by making researchers independent Tokio tasks:

- Each researcher **owns its own agent loop** with segmented execution
- On `MaxTurnError`, partial findings are **extracted from chat history** and accumulated
- On hook termination (`PromptCancelled`), partial data is still recovered
- The orchestrator collects results via `tokio::mpsc::channel` — fully decoupled

### Pipeline Flow

```
Phase 1: Spawn 5 Researcher Tokio Tasks (parallel, ~60-120s)
    │
    ├── tokio::spawn(Researcher[Layer 1: Vendor Sweep])
    │     └── Agent { TavilySearchTool + ThinkTool + ResearcherHook }
    │         ├── Segment 0: up to 10 turns → Ok(response) or MaxTurnsError
    │         ├── Segment 1: compact history, continue → accumulate findings
    │         └── Segment 2: final attempt → return partial or complete
    │
    ├── tokio::spawn(Researcher[Layer 2: Market Sweep])
    ├── tokio::spawn(Researcher[Layer 3: Moat-Attack Radar])
    ├── tokio::spawn(Researcher[Layer 4: Sovereign/Geo])
    └── tokio::spawn(Researcher[Layer 5: Narrative Velocity])
    │
    └── Results collected via mpsc::channel<ResearchResult>
                        ↓
Phase 2: Single LLM Synthesis Call (~30-60s)
    └── Preamble + all researcher findings → structured markdown report
                        ↓
Phase 3: Parse & Persist
    └── Regex parser → EngineResult → SQLite (data/deepagent_reports.db)
```

### Key Design Patterns

**Segmented Loops** — Each researcher runs up to `MAX_SEGMENTS=3` segments of `TURNS_PER_SEGMENT=10` turns each. When a segment hits `MaxTurnsError`, partial findings are extracted from the assistant messages in `chat_history`, accumulated, and injected into the next segment's prompt. This prevents the total loss of work that plagued the original approach.

```
Segment 0: "Search for AI vendor announcements..."
  → MaxTurnsError after 10 turns
  → Extract partial findings from chat history
  → Clear history, compact accumulated findings

Segment 1: "Continue. Findings so far: [accumulated]. Find more."
  → Ok(response) — researcher completed naturally
  → Return combined findings
```

**PromptHook (ResearcherHook)** — Each researcher agent has a hook that monitors tool calls. An `AtomicUsize` counter tracks `tavily_search` invocations. After 7 searches, the hook returns `ToolCallHookAction::Terminate`, which triggers `PromptCancelled` with the full chat history preserved. This enforces search budgets without losing data.

**Timeout Protection** — Each researcher task is wrapped in `tokio::time::timeout(Duration::from_secs(300))`. If a researcher hangs, the orchestrator receives a `ResearchResult::failed_timeout` and continues with the other layers.

**Graceful Degradation** — Each `ResearchResult` carries a status (`Completed`, `Partial`, `Failed`). The synthesis prompt includes the status per layer, so the LLM knows which layers have complete vs partial vs missing data and adjusts the report accordingly.

### Module Structure

```
rust-deepagent-backend/src/agents/
├── mod.rs            # Module declarations
├── orchestrator.rs   # run_deep_research(): spawn tasks, collect via mpsc, synthesize
├── researcher.rs     # Segmented loop agent with error recovery
├── tavily_tool.rs    # impl Tool for TavilySearchTool (rig Tool trait)
├── hooks.rs          # ResearcherHook: search budget enforcement via PromptHook
└── prompts.rs        # Per-layer researcher preambles + synthesis prompts
```

## Why the Rust Direct Backend Uses a Pipeline (Not Agents)

The direct pipeline (`rust-backend/`) takes a different philosophy: our 5-layer detection engine is **deterministic** — we know exactly what queries to run before any LLM is involved. The LLM only adds value in synthesis. Sub-agents add complexity and cost without adding intelligence for this use case.

```
Phase 1: Parallel Tavily Search (no LLM, ~3 seconds)
    ├─ Layer 1: Vendor Sweep         (3 queries)
    ├─ Layer 2: Market Sweep         (2 queries)
    ├─ Layer 3: Moat-Attack Radar    (2 queries)
    ├─ Layer 4: Sovereign/Geo        (2 queries)
    └─ Layer 5: Narrative Velocity   (2 queries)
    Total: 11 queries via futures::join_all
                    ↓
Phase 2: Single LLM Synthesis Call (~30-60s)
    └─ System prompt + all search results → markdown report
```

| Metric | Direct Pipeline | Deep Agent |
|--------|----------------|------------|
| LLM calls | 1 | 6 |
| Search coverage | Deterministic (11 fixed queries) | LLM-directed (adaptive) |
| Token cost | ~1x | ~3-5x |
| Search depth | Fixed | Adaptive (LLM can follow leads) |
| Fault tolerance | All-or-nothing per query | Segmented recovery |

The tradeoff: the direct pipeline is cheaper and faster, but the deep agent can discover connections and follow leads that predetermined queries miss.

## Key Differences from v1

| Aspect | v1 | v2 |
|--------|----|----|
| Research | Fixed pipeline (parallel LLM calls) | Multi-agent (Python) / Pipeline (Rust) / Deep Agent (Rust) |
| Engines | Two (Gemini + LangChain) | Three backend options |
| Report model | `gemini_result` + `langchain_result` | Single `result` field |
| ViralEvent | Missing `summary` | Includes `summary` |
| Database | Firestore | SQLite (aiosqlite / tokio-rusqlite) |
| Agent framework | None | DeepAgents (Python) / Rig (Rust) |

## API Contract

All three backends implement the same API:

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/health` | No | `{"status":"ok"}` |
| POST | `/api/auth/login` | No | `{access_token, token_type}` |
| GET | `/api/reports/` | JWT | `{reports: ResearchReport[], total}` |
| GET | `/api/reports/{id}` | JWT | `ResearchReport` |
| POST | `/api/reports/trigger` | JWT | `ResearchReport` (status="running") |

## Quick Start

### Prerequisites

- Python 3.11+ (for Python backend)
- Rust 1.75+ (for Rust backends)
- Node.js 18+ (for frontend)
- API keys: OpenAI, Tavily

### Setup

```bash
cp .env.example .env
# Edit .env with your API keys
```

### Running All Three Backends

To use the frontend's backend toggle, run backends on different ports:

**Rust Direct Backend (port 8000 — default):**

```bash
cd rust-backend
cargo run --release
# Listens on http://localhost:8000
```

**Python Backend (port 8001):**

```bash
cd python-backend
python3 -m venv .venv
source .venv/bin/activate          # macOS / Linux
# .venv\Scripts\activate           # Windows
pip install -e ".[dev]"
uvicorn backend.runtime.app:app --reload --reload-exclude '.venv' --port 8001
# Listens on http://localhost:8001
```

**Rust Deep Agent Backend (port 8002):**

```bash
cd rust-deepagent-backend
cargo run --release
# Listens on http://localhost:8002
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend includes a **backend selector toggle** (Rust / Python / Deep Agent) in both the login page and the navigation bar. It defaults to Rust (`localhost:8000`). Switching backends isolates auth tokens — you can be logged into all three simultaneously.

| Environment Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_RUST_API_BASE` | `http://localhost:8000` | Rust direct pipeline backend URL |
| `NEXT_PUBLIC_PYTHON_API_BASE` | `http://localhost:8001` | Python/FastAPI backend URL |
| `NEXT_PUBLIC_DEEPAGENT_API_BASE` | `http://localhost:8002` | Rust deep agent backend URL |

### Run Tests

```bash
# Python
cd python-backend
pytest backend/tests/ -v

# Rust (direct pipeline)
cd rust-backend
cargo test

# Rust (deep agent)
cd rust-deepagent-backend
cargo test
```

## Project Structure

```
deep_research_agent_v2/
├── frontend/                          # Next.js (React 19 + TypeScript)
├── python-backend/
│   ├── research_agent/                # DeepAgents tools + prompts
│   │   ├── tools.py                   # tavily_search, think_tool
│   │   └── prompts.py                 # Orchestrator + researcher prompts
│   ├── agent.py                       # build_agent() factory
│   ├── backend/
│   │   ├── types/                     # Layer 0: Domain models
│   │   ├── config/                    # Layer 1: Settings
│   │   ├── repo/                      # Layer 2: SQLite persistence
│   │   ├── service/                   # Layer 3: Auth, parser, orchestrator
│   │   ├── runtime/                   # Layer 4: DI, app entry
│   │   ├── ui/                        # Layer 5: FastAPI routes
│   │   └── tests/                     # Unit + integration tests
│   └── pyproject.toml
├── rust-backend/                      # Direct pipeline (Search → Synthesize)
│   ├── src/
│   │   ├── types/                     # Domain models
│   │   ├── auth/                      # JWT auth + middleware
│   │   ├── repo/                      # SQLite persistence
│   │   ├── agents/
│   │   │   ├── orchestrator.rs        # Two-phase pipeline (search + synthesize)
│   │   │   ├── tavily_tool.rs         # Direct Tavily search function
│   │   │   └── prompts.rs            # Synthesis prompt + search queries
│   │   ├── orchestration/             # Research runner
│   │   ├── routes/                    # Axum HTTP handlers
│   │   ├── parser.rs                  # Markdown parser
│   │   └── main.rs                    # Server entry (port 8000)
│   └── Cargo.toml
├── rust-deepagent-backend/            # Deep agent (Agent-as-Task pattern)
│   ├── src/
│   │   ├── types/                     # Domain models (shared with rust-backend)
│   │   ├── auth/                      # JWT auth + middleware
│   │   ├── repo/                      # SQLite persistence
│   │   ├── agents/
│   │   │   ├── orchestrator.rs        # Spawn 5 tasks, collect via mpsc, synthesize
│   │   │   ├── researcher.rs          # Segmented loop agent with error recovery
│   │   │   ├── tavily_tool.rs         # impl Tool for TavilySearchTool (rig trait)
│   │   │   ├── hooks.rs              # ResearcherHook (search budget via PromptHook)
│   │   │   └── prompts.rs            # Per-layer preambles + synthesis prompts
│   │   ├── orchestration/             # Research runner (calls run_deep_research)
│   │   ├── routes/                    # Axum HTTP handlers
│   │   ├── parser.rs                  # Markdown parser
│   │   └── main.rs                    # Server entry (port 8002)
│   └── Cargo.toml
├── .env.example
└── README.md
```
