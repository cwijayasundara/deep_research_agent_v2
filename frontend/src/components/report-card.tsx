"use client";

import Link from "next/link";
import { ResearchReport, EngineResult } from "@/lib/types";

interface ReportCardProps {
  report: ResearchReport;
}

export default function ReportCard({ report }: ReportCardProps) {
  return (
    <Link
      href={`/reports/${report.report_id}`}
      className="block rounded-xl border border-[#2a3a55] bg-[#131b2e]/80 p-4 hover:border-[#0d59f2]/40 transition-all duration-200 hover:shadow-lg hover:shadow-[#0d59f2]/5"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {report.run_date}
          </h3>
          <p className="text-[11px] text-gray-500 font-mono">
            {report.report_id.slice(0, 8)}...
          </p>
        </div>
        <div className="text-[11px] text-gray-500">
          {new Date(report.created_at).toLocaleDateString()}
        </div>
      </div>

      <EngineSummary result={report.result} />
    </Link>
  );
}

function EngineSummary({ result }: { result: EngineResult | null }) {
  if (!result) {
    return (
      <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "#00f2ff", opacity: 0.3 }}
          />
          <span className="text-[10px] font-medium text-gray-500">Deep Research</span>
        </div>
        <p className="text-[11px] text-gray-600">No data</p>
      </div>
    );
  }

  const statusColor =
    result.status === "completed" ? "bg-green-500" :
    result.status === "running" ? "bg-yellow-500 animate-pulse" :
    result.status === "failed" ? "bg-red-500" :
    "bg-gray-500";

  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
        <span className="text-[10px] font-medium text-gray-400">Deep Research</span>
        <span className="text-[10px] text-gray-600 ml-auto">
          {result.viral_events.length} events
        </span>
      </div>
      {result.tldr ? (
        <p className="text-[11px] text-gray-400 line-clamp-2">{result.tldr}</p>
      ) : (
        <p className="text-[11px] text-gray-600 italic">
          {result.status === "running" ? "Processing..." : result.status}
        </p>
      )}
    </div>
  );
}
