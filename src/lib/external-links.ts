import type { AuthorSummary } from "./openalex";

export interface ExtLink {
  label: string;
  url: string;
}

interface OrcidUrlsResponse {
  "researcher-url"?: Array<{
    "url-name"?: string | null;
    url?: { value?: string } | null;
  }>;
}

const NORMALIZE_RULES: Array<{
  test: (lower: string, url: string) => boolean;
  label: string;
}> = [
  { test: (l, u) => l === "linkedin" || u.includes("linkedin.com"), label: "LinkedIn" },
  {
    test: (l, u) => l === "twitter" || l === "x" || u.includes("twitter.com") || u.includes("x.com"),
    label: "X",
  },
  { test: (l, u) => l === "github" || u.includes("github.com"), label: "GitHub" },
  {
    test: (l, u) => l === "google scholar" || u.includes("scholar.google"),
    label: "Google Scholar",
  },
  { test: (l) => /^(personal( website)?|homepage|webpage|website|home page|lab|lab page)$/.test(l), label: "Homepage" },
  { test: (l, u) => u.includes("youtube.com") || u.includes("youtu.be"), label: "YouTube" },
  { test: (l, u) => u.includes("researchgate.net"), label: "ResearchGate" },
  { test: (l, u) => u.includes("semanticscholar.org"), label: "Semantic Scholar" },
];

function fallbackFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    // Use second-level domain ("randallbalestriero.com" → "Randallbalestriero",
    // "stanford.edu" → "Stanford"). Avoids the unhelpful "Link" fallback.
    const sld = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return sld.charAt(0).toUpperCase() + sld.slice(1);
  } catch {
    return "Link";
  }
}

function normalizeLabel(rawName: string, url: string): string {
  const lower = rawName.toLowerCase().trim();
  const lowerUrl = url.toLowerCase();
  for (const r of NORMALIZE_RULES) if (r.test(lower, lowerUrl)) return r.label;
  // Generic / unhelpful labels → use the URL's domain instead
  if (
    /^(link|url|website|web|webpage|web page|home|home page|page|other|profile)$/.test(
      lower,
    )
  ) {
    return fallbackFromUrl(url);
  }
  // Title-case the raw label
  return rawName.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function getOrcidUrls(orcidUrl: string | null | undefined): Promise<ExtLink[]> {
  if (!orcidUrl) return [];
  const id = orcidUrl.replace(/\/+$/, "").split("/").pop();
  if (!id || !/^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i.test(id)) return [];
  try {
    const res = await fetch(`https://pub.orcid.org/v3.0/${id}/researcher-urls`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data: OrcidUrlsResponse = await res.json();
    const out: ExtLink[] = [];
    for (const item of data["researcher-url"] ?? []) {
      const url = item.url?.value?.trim();
      if (!url) continue;
      const raw = item["url-name"]?.trim();
      const label = raw ? normalizeLabel(raw, url) : fallbackFromUrl(url);
      out.push({ url, label });
    }
    return out;
  } catch {
    return [];
  }
}

export function linkedInSearchUrl(name: string): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name)}`;
}

export function xSearchUrl(name: string): string {
  return `https://x.com/search?q=${encodeURIComponent(name)}&f=user`;
}

// Build the full list of external links for the dashboard, deduping by URL
// and combining: OpenAlex's ids object (twitter handle, wikipedia URL) +
// ORCID researcher-urls + search fallbacks for LinkedIn and X.
export function collectExternalLinks(
  author: AuthorSummary,
  orcidLinks: ExtLink[],
): ExtLink[] {
  const seen = new Set<string>();
  const out: ExtLink[] = [];
  const push = (l: ExtLink) => {
    const key = l.url.replace(/\/+$/, "").toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(l);
  };

  // Direct from OpenAlex ids
  if (author.ids?.twitter) {
    push({ label: "X", url: `https://x.com/${author.ids.twitter.replace(/^@/, "")}` });
  }
  if (author.ids?.wikipedia) {
    push({ label: "Wikipedia", url: author.ids.wikipedia });
  }

  // From ORCID researcher-urls
  for (const l of orcidLinks) push(l);

  // Search fallbacks if we have no direct profile yet
  const hasLinkedIn = out.some((l) => l.label === "LinkedIn");
  const hasX = out.some((l) => l.label === "X");
  if (!hasLinkedIn) {
    push({ label: "LinkedIn (search)", url: linkedInSearchUrl(author.display_name) });
  }
  if (!hasX) {
    push({ label: "X (search)", url: xSearchUrl(author.display_name) });
  }

  return out;
}
