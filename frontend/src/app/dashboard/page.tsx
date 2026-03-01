"use client";

import AuthGuard from "@/components/auth-guard";
import NavBar from "@/components/nav-bar";
import EnginePanel from "@/components/engine-panel";
import ReportCard from "@/components/report-card";
import DownloadReportButton from "@/components/download-report-button";
import { useReports } from "@/hooks/use-reports";

export default function DashboardPage() {
  const { reports, loading, error, trigger, triggering } = useReports();
  const latestReport = reports.length > 0 ? reports[0] : null;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#101622]">
        <NavBar />
        <main className="max-w-[1920px] mx-auto">
          {error && (
            <div className="mx-6 mt-4 px-4 py-2 bg-red-900/30 border border-red-700/50 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 px-6 pt-4">
            <DownloadReportButton report={latestReport} />
            <button
              onClick={() => trigger()}
              disabled={triggering}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {triggering ? "Running..." : "Trigger Research"}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-slate-400 text-sm animate-pulse">
                Loading latest report...
              </div>
            </div>
          ) : latestReport ? (
            <div className="px-6 py-4">
              <EnginePanel result={latestReport.result} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-slate-400 text-sm">No reports yet</p>
                <p className="text-slate-500 text-xs mt-1 mb-4">
                  Trigger a research run to get started
                </p>
                <button
                  onClick={() => trigger()}
                  disabled={triggering}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {triggering ? "Running..." : "Trigger Research"}
                </button>
              </div>
            </div>
          )}

          {/* Report History */}
          {reports.length > 1 && (
            <section className="px-6 py-8 border-t border-slate-800">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
                Report History
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {reports.slice(1).map((r) => (
                  <ReportCard key={r.report_id} report={r} />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
