import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS, PDF_FONTS, PDF_SPACING } from "@/lib/pdf-theme";
import { CompletenessAudit } from "@/lib/types";

interface AuditSectionProps {
  audit: CompletenessAudit | null;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: PDF_SPACING.sectionGap,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  headerBar: {
    width: 3,
    height: 16,
    backgroundColor: PDF_COLORS.cyan,
    marginRight: 8,
  },
  headerText: {
    fontSize: PDF_FONTS.heading,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.text,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: PDF_COLORS.border,
    borderRadius: 4,
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.brandBlue,
  },
  statLabel: {
    fontSize: PDF_FONTS.caption,
    color: PDF_COLORS.textMuted,
    marginTop: 2,
  },
  gapsLabel: {
    fontSize: PDF_FONTS.caption,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gapRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3,
    paddingLeft: 4,
  },
  gapBullet: {
    fontSize: PDF_FONTS.body,
    color: PDF_COLORS.priorityMedium,
    marginRight: 6,
  },
  gapText: {
    fontSize: PDF_FONTS.body,
    color: PDF_COLORS.textSecondary,
    flex: 1,
  },
});

export default function AuditSection({ audit }: AuditSectionProps) {
  if (!audit) return null;
  const scorePercent = Math.round(audit.confidence_score * 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBar} />
        <Text style={styles.headerText}>Completeness Audit</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{audit.verified_signals}</Text>
          <Text style={styles.statLabel}>Verified Signals</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{audit.sources_checked}</Text>
          <Text style={styles.statLabel}>Sources Checked</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{scorePercent}%</Text>
          <Text style={styles.statLabel}>Confidence</Text>
        </View>
      </View>
      {audit.gaps.length > 0 && (
        <View>
          <Text style={styles.gapsLabel}>Coverage Gaps</Text>
          {audit.gaps.map((gap, i) => (
            <View key={i} style={styles.gapRow}>
              <Text style={styles.gapBullet}>—</Text>
              <Text style={styles.gapText}>{gap}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
