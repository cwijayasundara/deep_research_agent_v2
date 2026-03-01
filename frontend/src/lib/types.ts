export type ResearchStatus = "pending" | "running" | "completed" | "failed";
export type ConfidenceLevel = "high" | "medium" | "low";
export type WhyIncludedTag = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export interface ViralEvent {
  headline: string;
  category: string;
  confidence: ConfidenceLevel;
  rank: number;
  country_region: string;
  why_included: WhyIncludedTag[];
  revenue_impact: string;
  what_changed: string[];
  proof_pack: string;
  // Backward compat: old fields kept as optional
  impact_rating?: number;
  source?: string;
  summary?: string;
}

export interface DeepDive {
  title: string;
  what_happened: string;
  why_it_matters: string;
  second_order_implications: string;
  what_to_watch: string;
  // Backward compat
  priority?: string;
  summary?: string;
  key_findings?: string[];
}

export interface CompletenessAudit {
  verified_signals: number;
  sources_checked: number;
  confidence_score: number;
  gaps: string[];
  reuters_articles?: string[];
  major_stock_moves?: string[];
  vendor_coverage?: string[];
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
