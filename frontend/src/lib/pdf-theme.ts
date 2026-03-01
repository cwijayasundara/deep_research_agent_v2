/** PDF color, font-size, and spacing constants for the print-friendly layout. */

export const PDF_COLORS = {
  brandBlue: "#0d59f2",
  cyan: "#00f2ff",
  white: "#ffffff",
  background: "#ffffff",
  text: "#1a1a2e",
  textSecondary: "#4a4a6a",
  textMuted: "#8888a0",
  border: "#e0e0e8",
  priorityHigh: "#dc2626",
  priorityMedium: "#d97706",
  priorityLow: "#9ca3af",
  confidential: "#c0c0c8",
} as const;

export const PDF_FONTS = {
  heading: 14,
  subheading: 11,
  body: 9.5,
  caption: 8,
  tiny: 7,
} as const;

export const PDF_SPACING = {
  pageMargin: 40,
  sectionGap: 18,
  itemGap: 8,
  cardPadding: 12,
  headerHeight: 24,
  footerHeight: 24,
} as const;
