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
    marginBottom: 8,
  },
  numberBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PDF_COLORS.brandBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.white,
  },
  title: {
    fontSize: PDF_FONTS.subheading,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.text,
    flex: 1,
  },
  sectionLabel: {
    fontSize: PDF_FONTS.caption,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.brandBlue,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 3,
  },
  sectionText: {
    fontSize: PDF_FONTS.body,
    color: PDF_COLORS.textSecondary,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  // Backward compat styles
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

function DiveSection({ label, content }: { label: string; content: string }) {
  if (!content) return null;
  return (
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionText}>{content}</Text>
    </View>
  );
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
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>{i + 1}</Text>
            </View>
            <Text style={styles.title}>{dive.title}</Text>
          </View>

          {/* v4.0 four-section format */}
          <DiveSection label="What Happened" content={dive.what_happened} />
          <DiveSection label="Why It Matters" content={dive.why_it_matters} />
          <DiveSection label="Second-Order Implications" content={dive.second_order_implications} />
          <DiveSection label="What to Watch" content={dive.what_to_watch} />

          {/* Backward compat: old summary + findings */}
          {dive.summary && !dive.what_happened && (
            <Text style={styles.sectionText}>{dive.summary}</Text>
          )}
          {dive.key_findings && dive.key_findings.length > 0 && !dive.what_happened && (
            <View>
              <Text style={styles.findingsLabel}>Key Findings</Text>
              {dive.key_findings.map((finding, j) => (
                <View key={j} style={styles.findingRow}>
                  <Text style={styles.findingBullet}>&#8226;</Text>
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
