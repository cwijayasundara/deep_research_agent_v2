import { getSelectedBackend } from "./backend";

function tokenKey(): string {
  return `deep_research_token_${getSelectedBackend()}`;
}

export function saveToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(tokenKey(), token);
  }
}

export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(tokenKey());
  }
  return null;
}

export function clearToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(tokenKey());
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
