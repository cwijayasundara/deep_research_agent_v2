"use client";

import { useParams } from "next/navigation";
import AuthGuard from "@/components/auth-guard";
import NavBar from "@/components/nav-bar";
import EnginePanel from "@/components/engine-panel";
import DownloadReportButton from "@/components/download-report-button";
import { useReportDetail } from "@/hooks/use-reports";

export default function ReportDetailPage() {
  const params = useParams();
  const reportId = params.id as string;
  const { report, loading, error } = useReportDetail(reportId);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#101622]">
        <NavBar />
        <main className="max-w-[1920px] mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-slate-400 text-sm animate-pulse">
                Loading report...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-red-400 text-sm">{error}</div>
            </div>
          ) : report ? (
            <>
              <div className="px-6 py-3 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="font-mono">{report.report_id}</span>
                    <span className="text-slate-600">|</span>
                    <span>
                      {new Date(report.run_date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <DownloadReportButton report={report} />
                </div>
              </div>
              <div className="px-6 py-4">
                <EnginePanel result={report.result} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-slate-400 text-sm">Report not found</div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
