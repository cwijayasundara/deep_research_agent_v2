/** Shared utility functions for parsing report content. */

import type { WhyIncludedTag } from "./types";

export const WHY_INCLUDED_LABELS: Record<WhyIncludedTag, string> = {
  A: "Market reaction",
  B: "Narrative dominance",
  C: "Workflow shift",
  D: "Competitive wedge",
  E: "Regulatory trigger",
  F: "Revenue-pool threat",
  G: "Sovereign/geopolitical shift",
};

export const WHY_INCLUDED_COLORS: Record<WhyIncludedTag, string> = {
  A: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  B: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  C: "bg-green-500/15 text-green-400 border-green-500/20",
  D: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  E: "bg-red-500/15 text-red-400 border-red-500/20",
  F: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  G: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
};

export interface ProofPackLink {
  url: string;
  isPrimary: boolean;
}

export function parseProofPack(proofPack: string): ProofPackLink[] {
  if (!proofPack) return [];
  return proofPack
    .split("→")
    .map((part, i) => part.trim())
    .filter((part) => isUrl(part))
    .map((url, i) => ({ url, isPrimary: i === 0 }));
}

export function isUrl(str: string): boolean {
  return /^https?:\/\//i.test(str.trim());
}

export function extractUrls(text: string): string[] {
  const urlRe = /https?:\/\/[^\s)>\]"']+/g;
  const matches = text.match(urlRe) || [];
  return [...new Set(matches)];
}

export function domainFrom(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function parseTldrBullets(tldr: string): string[] {
  const lines = tldr.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets: string[] = [];
  let current = "";

  for (const line of lines) {
    if (/^[-*]\s+/.test(line)) {
      if (current) bullets.push(current);
      current = line.replace(/^[-*]\s+/, "");
    } else if (/^\d+\.\s+/.test(line)) {
      if (current) bullets.push(current);
      current = line.replace(/^\d+\.\s+/, "");
    } else {
      current += (current ? " " : "") + line;
    }
  }
  if (current) bullets.push(current);
  return bullets;
}
