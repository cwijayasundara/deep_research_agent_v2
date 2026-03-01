export type ResearchStatus = "pending" | "running" | "completed" | "failed";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface ViralEvent {
  headline: string;
  category: string;
  impact_rating: number;
  confidence: ConfidenceLevel;
  source: string;
  summary: string;
}

export interface DeepDive {
  title: string;
  priority: string;
  summary: string;
  key_findings: string[];
}

export interface CompletenessAudit {
  verified_signals: number;
  sources_checked: number;
  confidence_score: number;
  gaps: string[];
}

export interface EngineResult {
  status: ResearchStatus;
  raw_markdown: string;
  tldr: string | null;
  viral_events: ViralEvent[];
  deep_dives: DeepDive[];
  completeness_audit: CompletenessAudit | null;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  error_message: string | null;
}

export interface ResearchReport {
  report_id: string;
  run_date: string;
  result: EngineResult | null;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface ReportsListResponse {
  reports: ResearchReport[];
  total: number;
}
