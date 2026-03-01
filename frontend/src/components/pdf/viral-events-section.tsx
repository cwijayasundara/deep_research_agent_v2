import { View, Text, Link, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS, PDF_FONTS, PDF_SPACING } from "@/lib/pdf-theme";
import { ViralEvent } from "@/lib/types";
import { isUrl, domainFrom, parseProofPack, WHY_INCLUDED_LABELS } from "@/lib/report-utils";

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
  headlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  rankBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PDF_COLORS.brandBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.white,
  },
  headline: {
    fontSize: PDF_FONTS.subheading,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.text,
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  badge: {
    fontSize: PDF_FONTS.caption,
    color: PDF_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 6,
  },
  tag: {
    fontSize: 6,
    color: PDF_COLORS.brandBlue,
    borderWidth: 0.5,
    borderColor: PDF_COLORS.brandBlue,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  sectionLabel: {
    fontSize: PDF_FONTS.caption,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 2,
  },
  bodyText: {
    fontSize: PDF_FONTS.body,
    color: PDF_COLORS.textSecondary,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 2,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: PDF_FONTS.body,
    color: PDF_COLORS.brandBlue,
    marginRight: 6,
    marginTop: 1,
  },
  bulletText: {
    fontSize: PDF_FONTS.body,
    color: PDF_COLORS.textSecondary,
    lineHeight: 1.4,
    flex: 1,
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
  arrow: {
    fontSize: PDF_FONTS.caption,
    color: PDF_COLORS.textMuted,
    marginHorizontal: 4,
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
      {events.map((event, i) => {
        const proofLinks = parseProofPack(event.proof_pack);
        return (
          <View key={i} style={styles.card} wrap={false}>
            <View style={styles.headlineRow}>
              {event.rank > 0 && (
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{event.rank}</Text>
                </View>
              )}
              <Text style={styles.headline}>{event.headline}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.badge}>{event.category.replace(/_/g, " ")}</Text>
              <Text style={confidenceStyles[event.confidence] ?? styles.confidenceMedium}>
                {event.confidence}
              </Text>
              {event.country_region ? (
                <Text style={styles.badge}>{event.country_region}</Text>
              ) : null}
            </View>
            {/* Why Included tags */}
            {event.why_included.length > 0 && (
              <View style={styles.tagRow}>
                {event.why_included.map((tag, j) => (
                  <Text key={j} style={styles.tag}>
                    {tag}: {WHY_INCLUDED_LABELS[tag]}
                  </Text>
                ))}
              </View>
            )}
            {/* Revenue Impact */}
            {event.revenue_impact ? (
              <View>
                <Text style={styles.sectionLabel}>Revenue Impact</Text>
                <Text style={styles.bodyText}>{event.revenue_impact}</Text>
              </View>
            ) : null}
            {/* What Changed */}
            {event.what_changed.length > 0 && (
              <View>
                <Text style={styles.sectionLabel}>What Changed</Text>
                {event.what_changed.map((item, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>&#8226;</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
            {/* Backward compat: old summary */}
            {event.summary ? (
              <Text style={styles.bodyText}>{event.summary}</Text>
            ) : null}
            {/* Proof Pack */}
            {proofLinks.length > 0 ? (
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                {proofLinks.map((link, j) => (
                  <View key={j} style={{ flexDirection: "row", alignItems: "center" }}>
                    {j > 0 && <Text style={styles.arrow}>&rarr;</Text>}
                    <Link src={link.url} style={styles.sourceLink}>
                      {domainFrom(link.url)}
                    </Link>
                  </View>
                ))}
              </View>
            ) : event.source && isUrl(event.source) ? (
              <Link src={event.source} style={styles.sourceLink}>
                {domainFrom(event.source)} — {event.source}
              </Link>
            ) : event.source ? (
              <Text style={styles.sourcePlain}>Source: {event.source}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
