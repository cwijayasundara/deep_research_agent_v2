import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS, PDF_FONTS, PDF_SPACING } from "@/lib/pdf-theme";
import { DeepDive } from "@/lib/types";

interface DeepDivesSectionProps {
  dives: DeepDive[];
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
  card: {
    borderWidth: 0.5,
    borderColor: PDF_COLORS.border,
    borderRadius: 4,
    padding: PDF_SPACING.cardPadding,
    marginBottom: PDF_SPACING.itemGap,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  priorityBadge: {
    fontSize: PDF_FONTS.caption,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  priorityHigh: {
    color: PDF_COLORS.white,
    backgroundColor: PDF_COLORS.priorityHigh,
  },
  priorityMedium: {
    color: PDF_COLORS.white,
    backgroundColor: PDF_COLORS.priorityMedium,
  },
  priorityLow: {
    color: PDF_COLORS.white,
    backgroundColor: PDF_COLORS.priorityLow,
  },
  title: {
    fontSize: PDF_FONTS.subheading,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.text,
    flex: 1,
  },
  summary: {
    fontSize: PDF_FONTS.body,
    color: PDF_COLORS.textSecondary,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  findingsLabel: {
    fontSize: PDF_FONTS.caption,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  findingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
    paddingLeft: 4,
  },
  findingBullet: {
    fontSize: PDF_FONTS.body,
    color: PDF_COLORS.brandBlue,
    marginRight: 6,
    marginTop: 1,
  },
  findingText: {
    fontSize: PDF_FONTS.body,
    color: PDF_COLORS.textSecondary,
    lineHeight: 1.4,
    flex: 1,
  },
});

function getPriorityStyle(priority: string) {
  const p = priority.toLowerCase();
  if (p === "high") return styles.priorityHigh;
  if (p === "medium") return styles.priorityMedium;
  return styles.priorityLow;
}

export default function DeepDivesSection({ dives }: DeepDivesSectionProps) {
  if (dives.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBar} />
        <Text style={styles.headerText}>Strategic Deep Dives</Text>
      </View>
      {dives.map((dive, i) => (
        <View key={i} style={styles.card} wrap={false}>
          <View style={styles.titleRow}>
            <Text style={[styles.priorityBadge, getPriorityStyle(dive.priority)]}>
              {dive.priority}
            </Text>
            <Text style={styles.title}>{dive.title}</Text>
          </View>
          <Text style={styles.summary}>{dive.summary}</Text>
          {dive.key_findings.length > 0 && (
            <View>
              <Text style={styles.findingsLabel}>Key Findings</Text>
              {dive.key_findings.map((finding, j) => (
                <View key={j} style={styles.findingRow}>
                  <Text style={styles.findingBullet}>•</Text>
                  <Text style={styles.findingText}>{finding}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
