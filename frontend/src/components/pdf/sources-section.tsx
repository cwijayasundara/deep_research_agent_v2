import { View, Text, Link, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS, PDF_FONTS, PDF_SPACING } from "@/lib/pdf-theme";
import { ViralEvent } from "@/lib/types";
import { isUrl, extractUrls, domainFrom } from "@/lib/report-utils";

interface SourcesSectionProps {
  events: ViralEvent[];
  rawMarkdown: string;
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
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
    paddingLeft: 4,
  },
  number: {
    fontSize: PDF_FONTS.caption,
    color: PDF_COLORS.textMuted,
    width: 20,
    fontFamily: "Courier",
  },
  urlColumn: {
    flex: 1,
  },
  domain: {
    fontSize: PDF_FONTS.body,
    fontFamily: "Helvetica-Bold",
    color: PDF_COLORS.text,
  },
  url: {
    fontSize: PDF_FONTS.caption,
    color: PDF_COLORS.brandBlue,
    textDecoration: "none",
  },
});

export default function SourcesSection({ events, rawMarkdown }: SourcesSectionProps) {
  const eventUrls = events.map((e) => e.source.trim()).filter(isUrl);
  const markdownUrls = extractUrls(rawMarkdown);
  const allUrls = [...new Set([...eventUrls, ...markdownUrls])];

  if (allUrls.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBar} />
        <Text style={styles.headerText}>Sources & References</Text>
      </View>
      {allUrls.map((url, i) => (
        <View key={i} style={styles.row} wrap={false}>
          <Text style={styles.number}>{i + 1}.</Text>
          <View style={styles.urlColumn}>
            <Text style={styles.domain}>{domainFrom(url)}</Text>
            <Link src={url} style={styles.url}>
              {url}
            </Link>
          </View>
        </View>
      ))}
    </View>
  );
}
