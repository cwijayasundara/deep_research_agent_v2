import {
  LoginResponse,
  ReportsListResponse,
  ResearchReport,
} from "./types";
import { getApiBase } from "./backend";
import { clearToken } from "./auth";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const base = getApiBase();
  const url = `${base}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      `Cannot reach backend at ${base} — is the server running?`,
      0
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    const errorText = await response.text().catch(() => "Unknown error");
    throw new ApiError(errorText, response.status);
  }

  return response.json() as Promise<T>;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function login(password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function getReports(
  token: string
): Promise<ReportsListResponse> {
  return request<ReportsListResponse>("/api/reports/", {
    headers: authHeaders(token),
  });
}

export async function getReport(
  id: string,
  token: string
): Promise<ResearchReport> {
  return request<ResearchReport>(`/api/reports/${id}`, {
    headers: authHeaders(token),
  });
}

export async function triggerResearch(
  token: string,
  date?: string
): Promise<ResearchReport> {
  return request<ResearchReport>("/api/reports/trigger", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(date ? { date } : {}),
  });
}

export { ApiError };
