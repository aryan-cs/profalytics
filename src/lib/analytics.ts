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
  const counts = author.counts_by_year ?? [];
  return [...counts]
    .sort((a, b) => a.year - b.year)
    .map((c) => ({ year: c.year, works: c.works_count, citations: c.cited_by_count }));
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

export function mostRecentAffiliation(
  author: AuthorSummary,
): AuthorSummary["affiliations"][number] | null {
  if (!author.affiliations?.length) return null;
  return (
    [...author.affiliations]
      .filter((a) => (a.years?.length ?? 0) > 0)
      .sort((a, b) => Math.max(...b.years) - Math.max(...a.years))[0] ?? null
  );
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
