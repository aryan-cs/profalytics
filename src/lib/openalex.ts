const OPENALEX = "https://api.openalex.org";
const MAILTO = process.env.OPENALEX_MAILTO;

async function openalex<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const url = new URL(OPENALEX + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  if (MAILTO) url.searchParams.set("mailto", MAILTO);
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAlex ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export interface Affiliation {
  institution: {
    id: string;
    display_name: string;
    country_code: string | null;
    type: string | null;
  };
  years: number[];
}

export interface AuthorTopic {
  id: string;
  display_name: string;
  count: number;
  subfield?: { display_name: string };
}

export interface AuthorSummary {
  id: string;
  display_name: string;
  orcid: string | null;
  works_count: number;
  cited_by_count: number;
  summary_stats: {
    h_index: number;
    i10_index: number;
    "2yr_mean_citedness": number;
  };
  affiliations: Affiliation[];
  last_known_institutions?: Array<{
    id: string;
    display_name: string;
    country_code: string | null;
  }>;
  topics?: AuthorTopic[];
  counts_by_year?: Array<{
    year: number;
    works_count: number;
    cited_by_count: number;
  }>;
  ids?: {
    openalex?: string;
    orcid?: string | null;
    twitter?: string;
    wikipedia?: string;
    scopus?: string;
  };
  works_api_url?: string;
}

export interface Work {
  id: string;
  title: string | null;
  display_name: string | null;
  publication_year: number;
  publication_date: string;
  cited_by_count: number;
  type: string;
  doi: string | null;
  primary_location: {
    source: { display_name: string | null; type: string | null } | null;
    landing_page_url: string | null;
  } | null;
  authorships: Array<{
    author_position: "first" | "middle" | "last";
    author: { id: string | null; display_name: string };
    institutions: Array<{ id: string; display_name: string }>;
  }>;
  grants: Array<{
    funder: string;
    funder_display_name: string;
    award_id: string | null;
  }>;
  open_access?: { is_oa: boolean; oa_url: string | null };
  counts_by_year?: Array<{ year: number; cited_by_count: number; works_count?: number }>;
  primary_topic?: {
    id: string;
    display_name: string;
    subfield?: { id: string; display_name: string };
    field?: { id: string; display_name: string };
    domain?: { id: string; display_name: string };
  } | null;
}

export function shortId(idUrl: string | null | undefined): string {
  if (!idUrl) return "";
  return idUrl.replace("https://openalex.org/", "");
}

// Acronym from institution name, ignoring stop-words and splitting on hyphens
// so "University of Illinois at Urbana-Champaign" → "UIUC".
function institutionAcronym(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter((w) => w && !/^(of|the|at|for|in|and|&|to|on)$/i.test(w))
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function affiliationScore(a: AuthorSummary, terms: string[]): number {
  if (!terms.length || !a.affiliations?.length) return 0;
  let best = 0;
  for (const aff of a.affiliations) {
    const name = aff.institution.display_name.toLowerCase();
    const acronym = institutionAcronym(aff.institution.display_name).toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (acronym === t) score += 4;
      else if (name.includes(t)) score += 2;
      else if (t.length >= 3 && acronym.includes(t)) score += 1;
    }
    if (score > best) best = score;
  }
  return best;
}

export interface SearchResult {
  results: AuthorSummary[];
  usedQuery: string;
  droppedTerms: string[];
  resolvedInstitution?: string;
}

interface InstitutionLookup {
  id: string;
  display_name: string;
}

const INSTITUTION_STOPWORDS = /^(of|the|at|and|or|in|by|for|to|on|with|a|an)$/i;

async function resolveInstitution(query: string): Promise<InstitutionLookup | null> {
  const q = query.trim();
  if (!q) return null;
  const tokens = q.split(/\s+/);
  if (tokens.every((t) => INSTITUTION_STOPWORDS.test(t))) return null;
  try {
    const data = await openalex<{ results: InstitutionLookup[] }>("/institutions", {
      search: q,
      per_page: 1,
    });
    return data.results[0] ?? null;
  } catch {
    return null;
  }
}

// Name-and-institution search. OpenAlex's `search=` parameter only matches
// the author's name, so a query like "Huan Zhang uiuc" returns zero hits.
// Strategy:
//   1. Try the full query against the author search.
//   2. If that fails, treat trailing tokens as a possible institution name,
//      resolve them through OpenAlex's /institutions endpoint, and filter
//      authors by that institution ID. Try longer trailing tails first
//      (more specific), then progressively shorter.
//   3. If neither yields hits, fall back to cascading truncation and
//      re-rank candidates by acronym/affiliation match against dropped terms.
export async function searchAuthors(q: string, perPage = 10): Promise<SearchResult> {
  const trimmed = q.trim();
  if (!trimmed) return { results: [], usedQuery: "", droppedTerms: [] };
  const allTokens = trimmed.split(/\s+/);

  // Strategy 1: full search
  const full = await openalex<{ results: AuthorSummary[] }>("/authors", {
    search: trimmed,
    per_page: perPage,
  });
  if (full.results.length > 0) {
    return { results: full.results, usedQuery: trimmed, droppedTerms: [] };
  }

  // Strategy 2: split into name + institution and use institution filter
  if (allTokens.length >= 2) {
    const maxInstTail = Math.min(5, allTokens.length - 1);
    for (let instCount = maxInstTail; instCount >= 1; instCount--) {
      const nameTokens = allTokens.slice(0, allTokens.length - instCount);
      const instTokens = allTokens.slice(allTokens.length - instCount);
      const inst = await resolveInstitution(instTokens.join(" "));
      if (!inst) continue;
      const instId = shortId(inst.id);
      const filtered = await openalex<{ results: AuthorSummary[] }>("/authors", {
        search: nameTokens.join(" "),
        filter: `affiliations.institution.id:${instId}`,
        per_page: perPage,
      });
      if (filtered.results.length > 0) {
        return {
          results: filtered.results,
          usedQuery: nameTokens.join(" "),
          droppedTerms: [],
          resolvedInstitution: inst.display_name,
        };
      }
    }
  }

  // Strategy 3: cascading truncation + affiliation re-ranking
  let tokens = allTokens.slice(0, -1);
  let results: AuthorSummary[] = [];
  while (tokens.length >= 1 && results.length === 0) {
    const data = await openalex<{ results: AuthorSummary[] }>("/authors", {
      search: tokens.join(" "),
      per_page: perPage,
    });
    results = data.results;
    if (results.length > 0 || tokens.length === 1) break;
    tokens = tokens.slice(0, -1);
  }
  const droppedTerms = allTokens.slice(tokens.length);
  if (results.length > 0 && droppedTerms.length > 0) {
    const lcDropped = droppedTerms.map((t) => t.toLowerCase());
    results = [...results].sort(
      (a, b) => affiliationScore(b, lcDropped) - affiliationScore(a, lcDropped),
    );
  }
  return { results, usedQuery: tokens.join(" "), droppedTerms };
}

export async function getAuthor(id: string): Promise<AuthorSummary> {
  return openalex<AuthorSummary>(`/authors/${id}`);
}

export async function getAuthorWorks(
  authorId: string,
  opts: { yearsBack?: number; perPage?: number } = {},
): Promise<Work[]> {
  const { yearsBack = 10, perPage = 200 } = opts;
  const fromYear = new Date().getFullYear() - yearsBack;
  const data = await openalex<{ results: Work[]; meta: { count: number } }>("/works", {
    filter: `author.id:${authorId},from_publication_date:${fromYear}-01-01`,
    per_page: perPage,
    sort: "publication_date:desc",
  });
  return data.results;
}

// Top-cited works of all time. Used to attribute citation-year spikes to the
// driving paper — older famous papers (e.g., ImageNet 2012, Dropout 2014)
// continue to receive citations long after publication, and the per-year
// counts on each work tell us which work drove each yearly spike.
export async function getTopCitedWorks(
  authorId: string,
  limit = 25,
): Promise<Work[]> {
  const data = await openalex<{ results: Work[] }>("/works", {
    filter: `author.id:${authorId}`,
    sort: "cited_by_count:desc",
    per_page: limit,
  });
  return data.results;
}
