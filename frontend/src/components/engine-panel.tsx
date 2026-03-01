"use client";

import { EngineResult, ViralEvent, DeepDive, ConfidenceLevel } from "@/lib/types";
import { isUrl, extractUrls, domainFrom, parseTldrBullets } from "@/lib/report-utils";

interface EnginePanelProps {
  result: EngineResult | null;
}

const ENGINE_CONFIG = {
  name: "Deep Research Engine",
  subtitle: "Rig + GPT-5-mini",
  color: "#00f2ff",
  icon: "R",
} as const;

export default function EnginePanel({ result }: EnginePanelProps) {
  const config = ENGINE_CONFIG;

  return (
    <div
      className="min-w-0 rounded-xl border bg-[#131b2e]/80 overflow-hidden"
      style={{
        borderColor: `${config.color}20`,
        boxShadow: `0 0 30px ${config.color}08, inset 0 1px 0 ${config.color}10`,
      }}
    >
      <AgentHeader config={config} result={result} />

      {!result ? (
        <NoDataState config={config} />
      ) : result.status === "running" ? (
        <RunningState config={config} />
      ) : result.status === "failed" ? (
        <FailedState error={result.error_message} />
      ) : (
        <div className="p-5 space-y-6">
          <TldrCard tldr={result.tldr} color={config.color} />
          <ViralEventsSection events={result.viral_events} color={config.color} />
          <StrategicDeepDives dives={result.deep_dives} color={config.color} />
          <CompletenessFooter audit={result.completeness_audit} color={config.color} />
          <SourcesSection events={result.viral_events} rawMarkdown={result.raw_markdown} color={config.color} />
        </div>
      )}
    </div>
  );
}

/* ─── Header ─── */

function AgentHeader({
  config,
  result,
}: {
  config: typeof ENGINE_CONFIG;
  result: EngineResult | null;
}) {
  const statusText = result?.status ?? "offline";
  const duration = result?.duration_seconds
    ? `${result.duration_seconds.toFixed(1)}s`
    : null;
  const eventCount = result?.viral_events.length ?? 0;
  const diveCount = result?.deep_dives.length ?? 0;

  return (
    <div
      className="px-5 py-3.5 flex items-center justify-between border-b"
      style={{ borderColor: `${config.color}15` }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white"
          style={{
            backgroundColor: `${config.color}20`,
            boxShadow: `0 0 12px ${config.color}30`,
          }}
        >
          {config.icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{config.name}</h3>
          <p className="text-[11px] text-gray-500">{config.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {result && result.status === "completed" && (
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-500">
            <span>{eventCount} events</span>
            <span className="text-gray-700">|</span>
            <span>{diveCount} deep dives</span>
          </div>
        )}
        {duration && (
          <span className="text-[11px] text-gray-500 font-mono">{duration}</span>
        )}
        <StatusBadge status={statusText} color={config.color} />
      </div>
    </div>
  );
}

function StatusBadge({ status, color }: { status: string; color: string }) {
  const isActive = status === "completed";
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider"
      style={{
        backgroundColor: isActive ? `${color}15` : "rgba(255,255,255,0.05)",
        color: isActive ? color : "#6b7280",
      }}
    >
      {status}
    </span>
  );
}

/* ─── Empty / Loading / Error states ─── */

function NoDataState({ config }: { config: typeof ENGINE_CONFIG }) {
  return (
    <div className="p-8 text-center">
      <div
        className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3"
        style={{ backgroundColor: `${config.color}10` }}
      >
        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-sm text-gray-500">No data available</p>
    </div>
  );
}

function RunningState({ config }: { config: typeof ENGINE_CONFIG }) {
  return (
    <div className="p-8 text-center">
      <svg
        className="animate-spin h-8 w-8 mx-auto mb-3"
        style={{ color: config.color }}
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-sm text-gray-400">Research in progress...</p>
    </div>
  );
}

function FailedState({ error }: { error: string | null }) {
  return (
    <div className="p-6">
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-sm text-red-400 font-medium">Research Failed</p>
        {error && <p className="text-xs text-red-400/70 mt-1">{error}</p>}
      </div>
    </div>
  );
}

/* ─── TL;DR ─── */

function TldrCard({ tldr, color }: { tldr: string | null; color: string }) {
  if (!tldr) return null;
  const bullets = parseTldrBullets(tldr);

  return (
    <div
      className="rounded-lg p-5 border"
      style={{
        backgroundColor: `${color}05`,
        borderColor: `${color}15`,
      }}
    >
      <SectionHeader label="Executive Summary" color={color} />
      {bullets.length > 1 ? (
        <ul className="space-y-2.5 mt-3">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-gray-300 leading-relaxed">{bullet}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-300 leading-relaxed mt-2">{tldr}</p>
      )}
    </div>
  );
}

/* ─── Viral Events ─── */

function ViralEventsSection({ events, color }: { events: ViralEvent[]; color: string }) {
  if (events.length === 0) return null;

  return (
    <div>
      <SectionHeader label={`Viral Events (${events.length})`} color={color} />
      <div className="mt-3 space-y-2.5">
        {events.map((event, i) => (
          <EventCard key={i} event={event} color={color} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event, color, defaultOpen }: { event: ViralEvent; color: string; defaultOpen?: boolean }) {
  const sourceIsLink = isUrl(event.source);

  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden"
    >
      {/* Collapsed summary: headline + metrics */}
      <summary className="px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5">
              <h5 className="text-sm text-gray-200 font-medium leading-snug">
                {event.headline}
              </h5>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <CategoryBadge category={event.category} />
              <div className="flex items-center gap-1.5">
                <ImpactBar rating={event.impact_rating} color={color} />
              </div>
              <ConfidenceBadge level={event.confidence} />
            </div>
          </div>
          <svg
            className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180 flex-shrink-0 mt-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </summary>

      {/* Expanded detail: summary + source link */}
      <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
        {/* Summary */}
        {event.summary && (
          <p className="text-sm text-gray-400 leading-relaxed">{event.summary}</p>
        )}

        {/* Source link */}
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {sourceIsLink ? (
            <a
              href={event.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-medium hover:underline"
              style={{ color }}
            >
              {domainFrom(event.source)}
              <span className="text-gray-600 font-normal ml-1.5 text-[11px]">
                {event.source.replace(/^https?:\/\//, "").slice(0, 60)}
              </span>
            </a>
          ) : (
            <span className="text-[12px] text-gray-500">{event.source}</span>
          )}
        </div>
      </div>
    </details>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const label = category.replace(/_/g, " ");
  return (
    <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] bg-white/5 text-gray-400 uppercase tracking-wider">
      {label}
    </span>
  );
}

function ImpactBar({ rating, color }: { rating: number; color: string }) {
  const width = Math.min(100, Math.max(0, rating * 10));
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] text-gray-400 font-mono w-6 text-right">{rating}/10</span>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const colors: Record<ConfidenceLevel, string> = {
    high: "text-green-400 bg-green-400/10",
    medium: "text-yellow-400 bg-yellow-400/10",
    low: "text-red-400 bg-red-400/10",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${colors[level]}`}>
      {level}
    </span>
  );
}

/* ─── Strategic Deep Dives ─── */

function StrategicDeepDives({ dives, color }: { dives: DeepDive[]; color: string }) {
  if (dives.length === 0) return null;

  return (
    <div>
      <SectionHeader label={`Strategic Deep Dives (${dives.length})`} color={color} />
      <div className="mt-3 space-y-2.5">
        {dives.map((dive, i) => (
          <details
            key={i}
            open={i === 0}
            className="group rounded-lg border border-white/5 overflow-hidden"
          >
            <summary className="px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PriorityBadge priority={dive.priority} />
                <span className="text-sm text-gray-200 font-medium">{dive.title}</span>
              </div>
              <svg
                className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180 flex-shrink-0 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
              {/* Summary */}
              <p className="text-sm text-gray-400 leading-relaxed">{dive.summary}</p>

              {/* Key Findings */}
              {dive.key_findings.length > 0 && (
                <div>
                  <h6 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                    Key Findings
                  </h6>
                  <ul className="space-y-1.5">
                    {dive.key_findings.map((finding, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-400 leading-relaxed">
                        <span style={{ color }} className="mt-1 flex-shrink-0">&#8226;</span>
                        <InlineLinked text={finding} color={color} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const normalized = priority.toLowerCase();
  const styles =
    normalized === "high"
      ? "text-red-400 bg-red-400/10 border-red-400/20"
      : normalized === "medium"
        ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
        : "text-gray-400 bg-gray-400/10 border-gray-400/20";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase ${styles}`}>
      {priority}
    </span>
  );
}

/* ─── Completeness Audit ─── */

function CompletenessFooter({
  audit,
  color,
}: {
  audit: EngineResult["completeness_audit"];
  color: string;
}) {
  if (!audit) return null;

  const scorePercent = Math.round(audit.confidence_score * 100);

  return (
    <div
      className="rounded-lg p-4 border"
      style={{
        backgroundColor: `${color}05`,
        borderColor: `${color}10`,
      }}
    >
      <SectionHeader label="Completeness Audit" color={color} />
      <div className="grid grid-cols-3 gap-4 mt-3 mb-2">
        <AuditStat label="Verified Signals" value={audit.verified_signals} color={color} />
        <AuditStat label="Sources Checked" value={audit.sources_checked} color={color} />
        <AuditStat label="Confidence" value={`${scorePercent}%`} color={color} />
      </div>
      {audit.gaps.length > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: `${color}10` }}>
          <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider font-medium">Coverage Gaps</p>
          <div className="flex flex-wrap gap-1.5">
            {audit.gaps.map((gap, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400/80 border border-orange-500/10"
              >
                {gap}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AuditStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

/* ─── Sources Section ─── */

function SourcesSection({
  events,
  rawMarkdown,
  color,
}: {
  events: ViralEvent[];
  rawMarkdown: string;
  color: string;
}) {
  // Collect all unique URLs from event sources and raw markdown
  const eventUrls = events
    .map((e) => e.source.trim())
    .filter(isUrl);
  const markdownUrls = extractUrls(rawMarkdown);
  const allUrls = [...new Set([...eventUrls, ...markdownUrls])];

  if (allUrls.length === 0) return null;

  return (
    <div>
      <SectionHeader label={`Sources & References (${allUrls.length})`} color={color} />
      <div className="mt-3 space-y-1.5">
        {allUrls.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-colors group"
          >
            <svg
              className="w-3.5 h-3.5 flex-shrink-0 text-gray-600 group-hover:text-gray-400 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="text-[11px] font-medium group-hover:underline truncate" style={{ color }}>
              {domainFrom(url)}
            </span>
            <span className="text-[10px] text-gray-600 truncate hidden sm:inline ml-auto max-w-[50%]">
              {url.replace(/^https?:\/\//, "")}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─── Inline text with auto-linked URLs ─── */

function InlineLinked({ text, color }: { text: string; color: string }) {
  const urlRe = /(https?:\/\/[^\s)>\]"']+)/g;
  const parts = text.split(urlRe);

  if (parts.length === 1) return <span>{text}</span>;

  return (
    <span>
      {parts.map((part, i) =>
        isUrl(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline break-all"
            style={{ color }}
          >
            {domainFrom(part)}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

/* ─── Shared ─── */

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <h4
      className="text-[10px] font-bold uppercase tracking-widest"
      style={{ color }}
    >
      {label}
    </h4>
  );
}
