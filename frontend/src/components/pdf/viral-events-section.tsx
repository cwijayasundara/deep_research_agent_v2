import { View, Text, Link, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS, PDF_FONTS, PDF_SPACING } from "@/lib/pdf-theme";
import { ViralEvent } from "@/lib/types";
import { isUrl, domainFrom } from "@/lib/report-utils";

interface ViralEventsSectionProps {
  events: ViralEvent[];
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
  headline: {
    fontSize: PDF_FONTS.subheading,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.text,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  badge: {
    fontSize: PDF_FONTS.caption,
    color: PDF_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  impactText: {
    fontSize: PDF_FONTS.caption,
    color: PDF_COLORS.brandBlue,
    fontFamily: "Helvetica-Bold",
  },
  confidenceHigh: {
    fontSize: PDF_FONTS.caption,
    color: "#16a34a",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  confidenceMedium: {
    fontSize: PDF_FONTS.caption,
    color: "#d97706",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  confidenceLow: {
    fontSize: PDF_FONTS.caption,
    color: "#dc2626",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  summary: {
    fontSize: PDF_FONTS.body,
    color: PDF_COLORS.textSecondary,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  sourceLink: {
    fontSize: PDF_FONTS.caption,
    color: PDF_COLORS.brandBlue,
    textDecoration: "none",
  },
  sourcePlain: {
    fontSize: PDF_FONTS.caption,
    color: PDF_COLORS.textMuted,
  },
});

const confidenceStyles: Record<string, typeof styles.confidenceHigh> = {
  high: styles.confidenceHigh,
  medium: styles.confidenceMedium,
  low: styles.confidenceLow,
};

export default function ViralEventsSection({ events }: ViralEventsSectionProps) {
  if (events.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBar} />
        <Text style={styles.headerText}>Viral Events</Text>
      </View>
      {events.map((event, i) => (
        <View key={i} style={styles.card} wrap={false}>
          <Text style={styles.headline}>{event.headline}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.badge}>{event.category.replace(/_/g, " ")}</Text>
            <Text style={styles.impactText}>Impact: {event.impact_rating}/10</Text>
            <Text style={confidenceStyles[event.confidence] ?? styles.confidenceMedium}>
              {event.confidence}
            </Text>
          </View>
          {event.summary ? (
            <Text style={styles.summary}>{event.summary}</Text>
          ) : null}
          {isUrl(event.source) ? (
            <Link src={event.source} style={styles.sourceLink}>
              {domainFrom(event.source)} — {event.source}
            </Link>
          ) : (
            <Text style={styles.sourcePlain}>Source: {event.source}</Text>
          )}
        </View>
      ))}
    </View>
  );
}
