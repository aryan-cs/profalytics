import type { AuthorSummary, Work } from "./openalex";
import { shortId } from "./openalex";

export type { AuthorSummary, Work };

export interface CoauthorStat {
  id: string;
  name: string;
  count: number;
  firstYear: number;
  lastYear: number;
}

export interface FunderStat {
  id: string;
  name: string;
  count: number;
  awards: string[];
}

export interface YearStat {
  year: number;
  works: number;
  citations: number;
  cumulativeWorks: number;
  cumulativeCitations: number;
  yoyWorksPercent: number | null;
  yoyCitationsPercent: number | null;
  cumulativeWorksGrowthPercent: number | null;
  cumulativeCitationsGrowthPercent: number | null;
}

export interface LabSizeEstimate {
  // distinct first-authors per year where target is last author
  byYear: Array<{ year: number; firstAuthors: number }>;
  medianRecent: number; // median over last 5 years
  totalDistinctFirstAuthors: number;
  totalLastAuthorWorks: number;
  applicable: boolean; // false if PI-last-author convention doesn't seem to apply
}

export function buildYearStats(author: AuthorSummary): YearStat[] {
  const counts = [...(author.counts_by_year ?? [])].sort((a, b) => a.year - b.year);
  let cumW = 0;
  let cumC = 0;
  let prevCumW = 0;
  let prevCumC = 0;
  return counts.map((c, i) => {
    prevCumW = cumW;
    prevCumC = cumC;
    cumW += c.works_count;
    cumC += c.cited_by_count;
    const prev = i > 0 ? counts[i - 1] : null;
    const yoyWorksPercent =
      prev && prev.works_count > 0
        ? ((c.works_count - prev.works_count) / prev.works_count) * 100
        : null;
    const yoyCitationsPercent =
      prev && prev.cited_by_count > 0
        ? ((c.cited_by_count - prev.cited_by_count) / prev.cited_by_count) * 100
        : null;
    const cumulativeWorksGrowthPercent =
      prevCumW > 0 ? ((cumW - prevCumW) / prevCumW) * 100 : null;
    const cumulativeCitationsGrowthPercent =
      prevCumC > 0 ? ((cumC - prevCumC) / prevCumC) * 100 : null;
    return {
      year: c.year,
      works: c.works_count,
      citations: c.cited_by_count,
      cumulativeWorks: cumW,
      cumulativeCitations: cumC,
      yoyWorksPercent,
      yoyCitationsPercent,
      cumulativeWorksGrowthPercent,
      cumulativeCitationsGrowthPercent,
    };
  });
}

export function topCoauthors(
  works: Work[],
  selfAuthorId: string,
  limit = 10,
): CoauthorStat[] {
  const selfShort = shortId(selfAuthorId);
  const map = new Map<string, CoauthorStat>();
  for (const w of works) {
    for (const a of w.authorships) {
      const aId = shortId(a.author.id);
      if (!aId || aId === selfShort) continue;
      const existing = map.get(aId);
      if (existing) {
        existing.count += 1;
        existing.firstYear = Math.min(existing.firstYear, w.publication_year);
        existing.lastYear = Math.max(existing.lastYear, w.publication_year);
      } else {
        map.set(aId, {
          id: aId,
          name: a.author.display_name,
          count: 1,
          firstYear: w.publication_year,
          lastYear: w.publication_year,
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export function topFunders(works: Work[], limit = 8): FunderStat[] {
  const map = new Map<string, FunderStat>();
  for (const w of works) {
    for (const g of w.grants ?? []) {
      const id = shortId(g.funder);
      const existing = map.get(id);
      if (existing) {
        existing.count += 1;
        if (g.award_id && !existing.awards.includes(g.award_id)) {
          existing.awards.push(g.award_id);
        }
      } else {
        map.set(id, {
          id,
          name: g.funder_display_name,
          count: 1,
          awards: g.award_id ? [g.award_id] : [],
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export function estimateLabSize(
  works: Work[],
  selfAuthorId: string,
): LabSizeEstimate {
  const selfShort = shortId(selfAuthorId);
  const distinctFirstAuthorsByYear = new Map<number, Set<string>>();
  const allFirstAuthors = new Set<string>();
  let lastAuthorWorks = 0;
  let totalWorks = 0;

  for (const w of works) {
    if (w.authorships.length < 2) continue;
    totalWorks += 1;
    const last = w.authorships[w.authorships.length - 1];
    const first = w.authorships[0];
    const lastId = shortId(last.author.id);
    const firstId = shortId(first.author.id);
    if (lastId !== selfShort) continue;
    if (!firstId || firstId === selfShort) continue; // sole/lead-only or unresolved first author
    lastAuthorWorks += 1;
    allFirstAuthors.add(firstId);
    const set = distinctFirstAuthorsByYear.get(w.publication_year) ?? new Set();
    set.add(firstId);
    distinctFirstAuthorsByYear.set(w.publication_year, set);
  }

  const byYear = [...distinctFirstAuthorsByYear.entries()]
    .map(([year, set]) => ({ year, firstAuthors: set.size }))
    .sort((a, b) => a.year - b.year);

  const recent = byYear.slice(-5).map((y) => y.firstAuthors);
  const median =
    recent.length === 0
      ? 0
      : recent.slice().sort((a, b) => a - b)[Math.floor(recent.length / 2)];

  const applicable = totalWorks === 0 ? false : lastAuthorWorks / totalWorks >= 0.2;

  return {
    byYear,
    medianRecent: median,
    totalDistinctFirstAuthors: allFirstAuthors.size,
    totalLastAuthorWorks: lastAuthorWorks,
    applicable,
  };
}

export interface CitationSpikeAttribution {
  title: string;
  url: string;
  year: number;
  publicationYear: number;
  totalCites: number;
  citesInYear: number | null;
  reason: "published-near-spike" | "top-contributor-this-year";
}

function workUrl(w: Work): string {
  if (w.primary_location?.landing_page_url) return w.primary_location.landing_page_url;
  if (w.doi) return w.doi.startsWith("http") ? w.doi : `https://doi.org/${w.doi}`;
  return `https://openalex.org/${shortId(w.id)}`;
}

// Detect citation-year spikes and identify the paper most likely responsible.
// Two-stage heuristic:
//   1. For spike year X, prefer a high-impact paper published in [X-1, X+1] —
//      e.g., Hinton's 2015 Nature "Deep Learning" paper explains his 2015 spike.
//   2. If none qualifies, fall back to the work with the highest per-year
//      citation count in year X (using each work's counts_by_year).
export function buildCitationSpikes(
  topWorks: Work[],
  yearStats: YearStat[],
): Map<number, CitationSpikeAttribution> {
  const out = new Map<number, CitationSpikeAttribution>();
  const nonZero = yearStats.map((y) => y.citations).filter((c) => c > 0);
  if (nonZero.length === 0) return out;
  const sorted = [...nonZero].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const threshold = Math.max(median * 1.3, 1);

  for (const y of yearStats) {
    if (y.citations < threshold) continue;

    // Stage 1: papers published in [y.year-1, y.year+1] sorted by lifetime cites
    const nearbyPubs = topWorks
      .filter((w) => Math.abs((w.publication_year ?? 0) - y.year) <= 1)
      .sort((a, b) => b.cited_by_count - a.cited_by_count);
    const newcomer = nearbyPubs[0];

    // Stage 2: top contributor by per-year count for this specific year
    let topContributor: { work: Work; cites: number } | null = null;
    for (const w of topWorks) {
      const c = w.counts_by_year?.find((ev) => ev.year === y.year);
      if (!c) continue;
      if (!topContributor || c.cited_by_count > topContributor.cites) {
        topContributor = { work: w, cites: c.cited_by_count };
      }
    }

    // Choose: prefer newcomer if it's clearly impactful (lifetime cites
    // > 10% of the spike year's total citations). Otherwise top contributor.
    const useNewcomer =
      newcomer && newcomer.cited_by_count >= y.citations * 0.1;
    const chosen = useNewcomer ? newcomer : topContributor?.work;
    if (!chosen) continue;
    const citesInYear = useNewcomer
      ? topContributor?.work === newcomer
        ? topContributor.cites
        : null
      : topContributor?.cites ?? null;

    out.set(y.year, {
      title: chosen.title ?? chosen.display_name ?? "Untitled",
      url: workUrl(chosen),
      year: y.year,
      publicationYear: chosen.publication_year,
      totalCites: chosen.cited_by_count,
      citesInYear,
      reason: useNewcomer ? "published-near-spike" : "top-contributor-this-year",
    });
  }
  return out;
}

export interface VenueStat {
  name: string;
  count: number;
  modalMonth: number; // 0-11
  type: string | null;
}

const VENUE_ABBR: Array<[RegExp, string]> = [
  [/neural information processing systems/i, "NeurIPS"],
  [/computer vision and pattern recognition/i, "CVPR"],
  [/european conference on computer vision/i, "ECCV"],
  [/international conference on computer vision/i, "ICCV"],
  [/international conference on machine learning/i, "ICML"],
  [/international conference on learning representations/i, "ICLR"],
  [/association for computational linguistics/i, "ACL"],
  [/empirical methods in natural language processing/i, "EMNLP"],
  [/north american chapter of the association for computational linguistics/i, "NAACL"],
  [/conference on robot learning/i, "CoRL"],
  [/international joint conference on artificial intelligence/i, "IJCAI"],
  [/aaai conference on artificial intelligence/i, "AAAI"],
  [/lecture notes in computer science/i, "LNCS"],
  [/proceedings of the vldb endowment/i, "VLDB"],
  [/nature machine intelligence/i, "Nature MI"],
  [/nature communications/i, "Nat. Commun."],
  [/nature medicine/i, "Nat. Med."],
  [/proceedings of the national academy of sciences/i, "PNAS"],
];

export function shortenVenue(name: string): string {
  for (const [re, abbr] of VENUE_ABBR) if (re.test(name)) return abbr;
  if (name.length <= 22) return name;
  return name.slice(0, 20).trimEnd() + "…";
}

export function topVenues(
  works: Work[],
  opts: { limit?: number; includeRepositories?: boolean } = {},
): VenueStat[] {
  const { limit = 3, includeRepositories = false } = opts;
  const map = new Map<string, { count: number; months: number[]; type: string | null }>();
  for (const w of works) {
    const src = w.primary_location?.source;
    if (!src?.display_name) continue;
    if (!includeRepositories && src.type === "repository") continue;
    if (!w.publication_date) continue;
    const month = new Date(w.publication_date).getUTCMonth();
    if (Number.isNaN(month)) continue;
    const existing = map.get(src.display_name);
    if (existing) {
      existing.count += 1;
      existing.months.push(month);
    } else {
      map.set(src.display_name, { count: 1, months: [month], type: src.type });
    }
  }
  const stats = [...map.entries()].map(([name, v]) => {
    const monthCounts = new Map<number, number>();
    for (const m of v.months) monthCounts.set(m, (monthCounts.get(m) ?? 0) + 1);
    let modalMonth = v.months[0];
    let best = 0;
    for (const [m, c] of monthCounts) if (c > best) { best = c; modalMonth = m; }
    return { name, count: v.count, modalMonth, type: v.type };
  });
  return stats.sort((a, b) => b.count - a.count).slice(0, limit);
}

// Pick the institution that best answers "where are they now?".
// Strategy: prefer affiliations active in the last RECENT_WINDOW years
// (sorted by recent-activity count desc, then by max year). Among inactive
// affiliations, fall back to lifetime activity. This handles two failure modes:
//   1. "Career move" — researcher moved labs recently; old institution has more
//      total years but new institution has all the recent activity.
//   2. "Misattribution noise" — a single 2026 paper got tagged to the wrong
//      institution; lifetime-active institutions still outrank it.
const RECENT_WINDOW = 5;

interface WeightedAff {
  aff: AuthorSummary["affiliations"][number];
  recentCount: number;
  totalCount: number;
  maxYear: number;
  typeRank: number;
}

// Tiebreaker: when recency and frequency are tied, prefer academic
// institutions over industry. Profalytics is for choosing academic mentors,
// so a researcher's university is the more meaningful "primary" than a
// consulting/sabbatical company role. Lower number = higher rank.
function institutionTypeRank(type: string | null | undefined): number {
  switch (type) {
    case "education":
      return 0;
    case "healthcare":
      return 1;
    case "facility":
      return 2;
    case "government":
      return 3;
    case "nonprofit":
      return 4;
    case "company":
      return 5;
    case "other":
      return 6;
    default:
      return 7;
  }
}

// Strip OpenAlex's trailing " (Country/Region)" annotation that distinguishes
// regional subsidiaries of companies — e.g., "Meta (United States)" → "Meta",
// "Google (United States)" → "Google". The user-facing label should be the
// brand name without country metadata.
export function displayInstitutionName(name: string): string {
  return name.replace(/\s*\([^()]+\)\s*$/, "").trim();
}

// Merge affiliations that share the same stripped display name. OpenAlex
// gives "Meta (United States)" and "Meta (Israel)" as distinct entities;
// users see one "Meta" with the combined year span.
function mergeAffiliationsByDisplayName(
  affs: AuthorSummary["affiliations"],
): AuthorSummary["affiliations"] {
  const map = new Map<string, AuthorSummary["affiliations"][number]>();
  for (const a of affs) {
    const key = displayInstitutionName(a.institution.display_name);
    const existing = map.get(key);
    if (existing) {
      const merged = Array.from(
        new Set([...existing.years, ...(a.years ?? [])]),
      ).sort((x, y) => x - y);
      map.set(key, {
        ...existing,
        institution: { ...existing.institution, display_name: key },
        years: merged,
      });
    } else {
      map.set(key, {
        ...a,
        institution: { ...a.institution, display_name: key },
      });
    }
  }
  return Array.from(map.values());
}

function weighAffiliations(
  affs: AuthorSummary["affiliations"],
): WeightedAff[] {
  const cutoff = new Date().getFullYear() - RECENT_WINDOW;
  return affs
    .filter((a) => (a.years?.length ?? 0) > 0)
    .map((a) => ({
      aff: a,
      recentCount: a.years.filter((y) => y >= cutoff).length,
      totalCount: a.years.length,
      maxYear: Math.max(...a.years),
      typeRank: institutionTypeRank(a.institution.type),
    }));
}

export function rankedAffiliations(
  author: AuthorSummary,
): AuthorSummary["affiliations"] {
  if (!author.affiliations?.length) return [];
  const merged = mergeAffiliationsByDisplayName(author.affiliations);
  return [...weighAffiliations(merged)]
    .sort((x, y) => {
      const xActive = x.recentCount > 0 ? 1 : 0;
      const yActive = y.recentCount > 0 ? 1 : 0;
      if (xActive !== yActive) return yActive - xActive;
      if (xActive && yActive) {
        if (y.recentCount !== x.recentCount) return y.recentCount - x.recentCount;
        if (y.maxYear !== x.maxYear) return y.maxYear - x.maxYear;
        // Final tiebreaker: institution type (universities before companies)
        if (x.typeRank !== y.typeRank) return x.typeRank - y.typeRank;
        return y.totalCount - x.totalCount;
      }
      if (y.totalCount !== x.totalCount) return y.totalCount - x.totalCount;
      if (y.maxYear !== x.maxYear) return y.maxYear - x.maxYear;
      return x.typeRank - y.typeRank;
    })
    .map((w) => w.aff);
}

export function primaryAffiliation(
  author: AuthorSummary,
): AuthorSummary["affiliations"][number] | null {
  return rankedAffiliations(author)[0] ?? null;
}

export function paceLabel(papersPerYear: number): string | null {
  if (papersPerYear <= 0) return null;
  const daysPer = 365.25 / papersPerYear;
  if (daysPer < 7) {
    const n = Math.max(1, Math.round(daysPer));
    return `Roughly 1 paper every ${n} ${n === 1 ? "day" : "days"}`;
  }
  if (daysPer < 60) {
    const w = Math.max(1, Math.round(daysPer / 7));
    return `Roughly 1 paper every ${w} ${w === 1 ? "week" : "weeks"}`;
  }
  const m = Math.max(1, Math.round(daysPer / 30.4));
  return `Roughly 1 paper every ${m} ${m === 1 ? "month" : "months"}`;
}

// Strip middle initials (single capital letter + period) so Scholar's
// strict profile search matches. "Geoffrey E. Hinton" returns zero hits;
// "Geoffrey Hinton" finds his profile. Only strip when there are 3+ tokens
// so we don't reduce "G. Hinton" → "Hinton".
function stripMiddleInitials(name: string): string {
  const tokens = name.split(/\s+/);
  if (tokens.length < 3) return name;
  const cleaned = tokens.filter((t) => !/^[A-Z]\.$/.test(t)).join(" ").trim();
  return cleaned.length >= 3 ? cleaned : name;
}

// Google Scholar author-profile search. Lands on a list of matching scholar
// profiles (not papers), so the user picks the right person in one click.
// We can't deep-link to the profile itself because Scholar IDs aren't carried
// in OpenAlex and Scholar has no public API.
export function scholarSearchUrl(author: AuthorSummary): string {
  const name = stripMiddleInitials(author.display_name);
  return `https://scholar.google.com/citations?view_op=search_authors&mauthors=${encodeURIComponent(name)}`;
}

// OpenAlex tags conference proceedings inconsistently — NeurIPS/CVPR/ICCV
// papers often arrive as source.type "journal" or "repository". So we layer
// in a name-pattern check that recognizes the major academic conferences.
// Workshops/symposia are intentionally not included — they're a separate
// publication tier most researchers wouldn't count toward "conference papers".
const CONFERENCE_NAME_PATTERNS: RegExp[] = [
  /neural information processing systems/i,
  /\bneurips\b/i,
  /computer vision and pattern recognition/i,
  /\bcvpr\b/i,
  /european conference on computer vision/i,
  /\beccv\b/i,
  /international conference on computer vision/i,
  /\biccv\b/i,
  /international conference on machine learning/i,
  /\bicml\b/i,
  /international conference on learning representations/i,
  /\biclr\b/i,
  /association for computational linguistics/i,
  /empirical methods in natural language processing/i,
  /\bemnlp\b/i,
  /north american chapter of the association for computational linguistics/i,
  /\bnaacl\b/i,
  /conference on robot learning/i,
  /\bcorl\b/i,
  /international joint conference on artificial intelligence/i,
  /\bijcai\b/i,
  /aaai conference on artificial intelligence/i,
  /\baaai\b/i,
  /proceedings of the vldb/i,
  /\bsiggraph\b/i,
  /\buist\b/i,
  /\bchi conference\b/i,
  /\busenix\b/i,
  /\bisca\b.*architecture/i,
  /\bsosp\b/i,
  /\bosdi\b/i,
  /lecture notes in computer science/i,
];

// CS conferences index very late in OpenAlex — a researcher's NeurIPS or CVPR
// paper from December 2025 typically appears as just an arXiv preprint for
// 6–12 months before the conference version lands. So for CS researchers, the
// arXiv version is the best leading indicator of conference output. We count
// any arXiv-hosted work with a Computer Science primary topic, regardless of
// whether OpenAlex tagged it `preprint` or `article` (the tagging is
// inconsistent — Fei-Fei's CS arXiv works show as "article", LeCun's as
// "preprint"). Medical/social preprint servers like medRxiv and SSRN are
// excluded because those don't feed into the conference circuit.
function isArxivCsWork(w: Work): boolean {
  const src = w.primary_location?.source;
  const venue = (src?.display_name ?? "").toLowerCase();
  if (!venue.includes("arxiv")) return false;
  const field = w.primary_topic?.field?.display_name;
  return field === "Computer Science";
}

export function isConferencePaper(w: Work): boolean {
  const src = w.primary_location?.source;
  if (src?.type === "conference") return true;
  const name = src?.display_name;
  if (name && CONFERENCE_NAME_PATTERNS.some((p) => p.test(name))) return true;
  return isArxivCsWork(w);
}

export interface PublicationRate {
  conference: number;
  allWorks: number;
  windowDays: number;
}

// Trailing 365-day count. Using a rolling window instead of "this calendar
// year" means the number doesn't artificially shrink when checked in January
// or February — it's always a stable "papers in the last 12 months" rate.
export function currentPublicationRate(
  works: Work[],
  windowDays = 365,
): PublicationRate {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);
  let conference = 0;
  let allWorks = 0;
  for (const w of works) {
    if (!w.publication_date) continue;
    const d = new Date(w.publication_date);
    if (isNaN(d.getTime()) || d < cutoff) continue;
    allWorks += 1;
    if (isConferencePaper(w)) conference += 1;
  }
  return { conference, allWorks, windowDays };
}

export function publicationCadence(works: Work[]): {
  monthly: Array<{ month: number; count: number }>;
  perYearAverage: number;
} {
  const monthCounts = new Array(12).fill(0);
  const yearCounts = new Map<number, number>();
  for (const w of works) {
    if (w.publication_date) {
      const month = new Date(w.publication_date).getUTCMonth();
      if (!Number.isNaN(month)) monthCounts[month] += 1;
    }
    yearCounts.set(w.publication_year, (yearCounts.get(w.publication_year) ?? 0) + 1);
  }
  const years = [...yearCounts.values()];
  const avg = years.length ? years.reduce((a, b) => a + b, 0) / years.length : 0;
  return {
    monthly: monthCounts.map((count, month) => ({ month, count })),
    perYearAverage: avg,
  };
}
