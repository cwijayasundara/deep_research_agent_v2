# Deep Research Agent v2 — Multi-Agent Architecture

A daily AI intelligence tracker powered by multi-agent research pipelines. Two backend options (Python/DeepAgents and Rust/Rig) serve the same Next.js frontend via an identical REST/JSON API.

## Architecture

```
                     ┌─────────────────────┐
                     │   Next.js Frontend   │
                     │   (copied from v1)   │
                     └─────────┬───────────┘
                               │ REST/JSON API
                 ┌─────────────┴─────────────┐
                 │                           │
    ┌────────────▼────────────┐  ┌───────────▼────────────┐
    │  Python/DeepAgents      │  │  Rust/Rig              │
    │  FastAPI + LangGraph    │  │  Axum + Rig 0.31       │
    │  (Sub-Agent Pattern)    │  │  (Direct Pipeline)     │
    └────────────┬────────────┘  └───────────┬────────────┘
                 │                           │
    ┌────────────▼──────────┐   ┌────────────▼──────────┐
    │  Multi-Agent Pipeline │   │  Search → Synthesize  │
    │                       │   │  Pipeline             │
    │  Orchestrator Agent   │   │                       │
    │   ├── think_tool      │   │  Phase 1: Parallel    │
    │   ├── Researcher ×5   │   │    Tavily Search      │
    │   └── Synthesize      │   │    (11 queries, no    │
    │                       │   │     LLM, ~3 seconds)  │
    │  Researcher Sub-Agent │   │                       │
    │   ├── Tavily search   │   │  Phase 2: Single LLM  │
    │   ├── think_tool      │   │    Synthesis Call     │
    │   └── Cited findings  │   │    (~30-60 seconds)   │
    └───────────────────────┘   └───────────────────────┘
```

## Why the Rust Backend Uses a Direct Pipeline (Not Sub-Agents)

The Python backend successfully uses the DeepAgents sub-agent pattern (orchestrator → researcher sub-agents → Tavily). We initially implemented the same pattern in Rust using rig-core 0.31's `Agent-as-Tool` wrapper. However, this approach hit fundamental problems:

### Problems with Sub-Agents in rig-core

1. **MaxTurnError data loss** — When a researcher sub-agent hit its turn limit, ALL intermediate search results were lost. The orchestrator received only an error message, not the partial data the researcher had already gathered. This made reports incomplete and unpredictable.

2. **Double token cost** — Both the orchestrator LLM and each researcher LLM consumed tokens for reasoning. The researcher agents spent tokens deciding *what* to search, but our 5-layer detection engine already defines exactly what to search. This reasoning overhead was pure waste.

3. **Non-deterministic search coverage** — The LLM decided when and what to search. Some runs would skip layers entirely or spend too many turns on one layer. But our 5-layer engine is fully predetermined — there's no decision to make.

4. **Fragile turn budgets** — Each Tavily search + LLM response = 2 turns. With `max_turns=15` per researcher, only ~7 searches were possible before hitting the limit. Increasing the budget increased cost without fixing the underlying design mismatch.

### The Key Insight

Our 5-layer detection engine is **deterministic**. We know exactly what queries to run across all 5 layers before any LLM is involved. The LLM only adds value in the *synthesis* step — turning raw search results into a structured report. Sub-agents add complexity and cost without adding intelligence.

### Rust Pipeline Design

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
                    ↓
Phase 3: Parse & Persist (unchanged)
    └─ Regex parser → EngineResult → SQLite
```

### Results

| Metric | Sub-Agent (old) | Direct Pipeline (new) |
|--------|----------------|----------------------|
| MaxTurnError risk | High | Zero (no agent loops) |
| LLM calls | 6 (orchestrator + 5 researchers) | 1 (synthesis only) |
| Search coverage | Non-deterministic | All 5 layers guaranteed |
| Token cost | ~2x (reasoning overhead) | ~1x (synthesis only) |
| Typical events parsed | Variable (data loss) | 15-20 events |

The Python backend keeps the DeepAgents sub-agent pattern — it works well there because DeepAgents handles turn limits and partial results more gracefully.

## Key Differences from v1

| Aspect | v1 | v2 |
|--------|----|----|
| Research | Fixed pipeline (parallel LLM calls) | Multi-agent (Python) / Search→Synthesize pipeline (Rust) |
| Engines | Two (Gemini + LangChain) | Single agent pipeline |
| Report model | `gemini_result` + `langchain_result` | Single `result` field |
| ViralEvent | Missing `summary` | Includes `summary` |
| Database | Firestore | SQLite (aiosqlite / tokio-rusqlite) |
| Agent framework | None | DeepAgents (Python) / Rig (Rust) |

## API Contract

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
- Rust 1.75+ (for Rust backend)
- Node.js 18+ (for frontend)
- API keys: OpenAI, Tavily

### Setup

```bash
cp .env.example .env
# Edit .env with your API keys
```

### Running Both Backends Simultaneously

To use the frontend's backend toggle, run both backends on different ports:

**Rust Backend (port 8000 — default):**

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

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend includes a **backend selector toggle** in both the login page and the navigation bar. It defaults to Rust (`localhost:8000`). Switching backends isolates auth tokens — you can be logged into both simultaneously.

| Environment Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_RUST_API_BASE` | `http://localhost:8000` | Rust/Axum backend URL |
| `NEXT_PUBLIC_PYTHON_API_BASE` | `http://localhost:8001` | Python/FastAPI backend URL |

### Run Tests

```bash
# Python
cd python-backend
pytest backend/tests/ -v

# Rust
cd rust-backend
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
├── rust-backend/
│   ├── src/
│   │   ├── types/                     # Domain models
│   │   ├── auth/                      # JWT auth + middleware
│   │   ├── repo/                      # SQLite persistence
│   │   ├── agents/                    # Search → Synthesize pipeline
│   │   │   ├── orchestrator.rs        # Two-phase pipeline (search + synthesize)
│   │   │   ├── tavily_tool.rs         # Direct Tavily search function
│   │   │   └── prompts.rs            # Synthesis prompt + search queries
│   │   ├── orchestration/             # Research runner
│   │   ├── routes/                    # Axum HTTP handlers
│   │   ├── parser.rs                  # Markdown parser
│   │   └── main.rs                    # Server entry
│   └── Cargo.toml
├── .env.example
└── README.md
```
