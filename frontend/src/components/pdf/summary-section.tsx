import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS, PDF_FONTS, PDF_SPACING } from "@/lib/pdf-theme";
import { parseTldrBullets } from "@/lib/report-utils";

interface SummarySectionProps {
  tldr: string | null;
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
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: PDF_COLORS.brandBlue,
    marginTop: 4,
    marginRight: 8,
  },
  bulletText: {
    fontSize: PDF_FONTS.body,
    color: PDF_COLORS.textSecondary,
    lineHeight: 1.5,
    flex: 1,
  },
  plainText: {
    fontSize: PDF_FONTS.body,
    color: PDF_COLORS.textSecondary,
    lineHeight: 1.5,
  },
});

export default function SummarySection({ tldr }: SummarySectionProps) {
  if (!tldr) return null;
  const bullets = parseTldrBullets(tldr);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBar} />
        <Text style={styles.headerText}>Executive Summary</Text>
      </View>
      {bullets.length > 1 ? (
        bullets.map((bullet, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.plainText}>{tldr}</Text>
      )}
    </View>
  );
}
