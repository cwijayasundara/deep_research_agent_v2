import { Document } from "@react-pdf/renderer";
import { ResearchReport } from "@/lib/types";
import CoverPage from "./cover-page";
import ContentPage from "./content-page";
import SummarySection from "./summary-section";
import ViralEventsSection from "./viral-events-section";
import DeepDivesSection from "./deep-dives-section";
import AuditSection from "./audit-section";
import SourcesSection from "./sources-section";

interface ReportDocumentProps {
  report: ResearchReport;
}

export default function ReportDocument({ report }: ReportDocumentProps) {
  const result = report.result;
  if (!result) return null;

  return (
    <Document
      title={`Research Report — ${report.run_date}`}
      author="Deep Research Engine"
      subject="Global AI Viral Intelligence Tracker"
    >
      <CoverPage report={report} />
      <ContentPage reportId={report.report_id}>
        <SummarySection tldr={result.tldr} />
        <ViralEventsSection events={result.viral_events} />
        <DeepDivesSection dives={result.deep_dives} />
        <AuditSection audit={result.completeness_audit} />
        <SourcesSection
          events={result.viral_events}
          rawMarkdown={result.raw_markdown}
        />
      </ContentPage>
    </Document>
  );
}
