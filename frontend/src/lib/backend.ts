export type Backend = "rust" | "python";

const STORAGE_KEY = "deep_research_backend";

const RUST_API_BASE =
  process.env.NEXT_PUBLIC_RUST_API_BASE || "http://localhost:8000";
const PYTHON_API_BASE =
  process.env.NEXT_PUBLIC_PYTHON_API_BASE || "http://localhost:8001";

export function getSelectedBackend(): Backend {
  if (typeof window === "undefined") return "rust";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "rust" || stored === "python") return stored;
  return "rust";
}

export function setSelectedBackend(backend: Backend): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, backend);
  }
}

export function getApiBase(backend?: Backend): string {
  const b = backend ?? getSelectedBackend();
  return b === "rust" ? RUST_API_BASE : PYTHON_API_BASE;
}
