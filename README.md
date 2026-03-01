# Deep Research Agent v2 — Multi-Agent Architecture

A daily AI intelligence tracker powered by true multi-agent research pipelines. Two backend options (Python/DeepAgents and Rust/Rig) serve the same Next.js frontend via an identical REST/JSON API.

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
    └────────────┬────────────┘  └───────────┬────────────┘
                 │                           │
    ┌────────────▼────────────────────────────▼────────────┐
    │              Multi-Agent Research Pipeline            │
    │                                                      │
    │  Orchestrator Agent                                  │
    │    ├── Plans research strategy (think_tool)          │
    │    ├── Delegates to sub-agents (1-3 parallel)        │
    │    ├── Synthesizes findings                          │
    │    └── Produces structured markdown report           │
    │                                                      │
    │  Researcher Sub-Agent(s)                             │
    │    ├── Web search via Tavily                         │
    │    ├── Reflects after each search (think_tool)       │
    │    └── Returns cited findings                        │
    └──────────────────────────────────────────────────────┘
```

## Key Differences from v1

| Aspect | v1 | v2 |
|--------|----|----|
| Research | Fixed pipeline (parallel LLM calls) | Multi-agent with planning + delegation |
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
│   │   ├── agents/                    # Multi-agent components
│   │   │   ├── orchestrator.rs        # Orchestrator agent
│   │   │   ├── researcher_tool.rs     # Agent-as-Tool wrapper
│   │   │   ├── tavily_tool.rs         # Tavily Rig Tool
│   │   │   └── prompts.rs            # Agent prompts
│   │   ├── orchestration/             # Research runner
│   │   ├── routes/                    # Axum HTTP handlers
│   │   ├── parser.rs                  # Markdown parser
│   │   └── main.rs                    # Server entry
│   └── Cargo.toml
├── .env.example
└── README.md
```
