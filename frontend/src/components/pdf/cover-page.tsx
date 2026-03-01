import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS, PDF_FONTS, PDF_SPACING } from "@/lib/pdf-theme";
import { ResearchReport } from "@/lib/types";

interface CoverPageProps {
  report: ResearchReport;
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: PDF_COLORS.background,
    padding: 0,
    fontFamily: "Helvetica",
  },
  brandBar: {
    height: 8,
    backgroundColor: PDF_COLORS.brandBlue,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: PDF_SPACING.pageMargin,
  },
  titleBlock: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: PDF_COLORS.brandBlue,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: PDF_COLORS.cyan,
    marginVertical: 24,
  },
  metaBlock: {
    alignItems: "center",
    marginBottom: 32,
  },
  reportId: {
    fontSize: PDF_FONTS.caption,
    color: PDF_COLORS.textMuted,
    fontFamily: "Courier",
    marginBottom: 6,
  },
  date: {
    fontSize: PDF_FONTS.subheading,
    color: PDF_COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 16,
  },
  statBox: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.brandBlue,
  },
  statLabel: {
    fontSize: PDF_FONTS.caption,
    color: PDF_COLORS.textMuted,
    marginTop: 2,
  },
  footer: {
    paddingBottom: 30,
    alignItems: "center",
  },
  confidential: {
    fontSize: PDF_FONTS.caption,
    color: PDF_COLORS.confidential,
    letterSpacing: 4,
    textTransform: "uppercase",
  },
});

export default function CoverPage({ report }: CoverPageProps) {
  const result = report.result;
  const formattedDate = new Date(report.run_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const duration = result?.duration_seconds
    ? `${result.duration_seconds.toFixed(1)}s`
    : "—";
  const confidence = result?.completeness_audit
    ? `${Math.round(result.completeness_audit.confidence_score * 100)}%`
    : "—";
  const eventCount = result?.viral_events.length ?? 0;
  const diveCount = result?.deep_dives.length ?? 0;

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.brandBar} />
      <View style={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Global AI Viral Intelligence Tracker</Text>
          <Text style={styles.subtitle}>Deep Research Report</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metaBlock}>
          <Text style={styles.reportId}>{report.report_id}</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{duration}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{confidence}</Text>
            <Text style={styles.statLabel}>Confidence</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{eventCount}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{diveCount}</Text>
            <Text style={styles.statLabel}>Deep Dives</Text>
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.confidential}>Confidential</Text>
      </View>
    </Page>
  );
}
