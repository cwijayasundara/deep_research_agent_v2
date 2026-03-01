/** Shared utility functions for parsing report content. */

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
