"use client";

import { useState } from "react";
import { ResearchReport } from "@/lib/types";

interface DownloadReportButtonProps {
  report: ResearchReport | null;
}

export default function DownloadReportButton({ report }: DownloadReportButtonProps) {
  const [generating, setGenerating] = useState(false);

  const disabled = !report?.result || report.result.status !== "completed";

  async function handleDownload() {
    if (!report?.result) return;
    setGenerating(true);

    try {
      const [{ pdf }, { default: ReportDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/pdf/report-document"),
      ]);

      const blob = await pdf(<ReportDocument report={report} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `research-report-${report.run_date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={disabled || generating}
      className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {generating ? "Generating PDF..." : "Download Report"}
    </button>
  );
}
