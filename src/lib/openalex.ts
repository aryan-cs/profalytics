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
}

export function shortId(idUrl: string | null | undefined): string {
  if (!idUrl) return "";
  return idUrl.replace("https://openalex.org/", "");
}

export async function searchAuthors(q: string, perPage = 10): Promise<AuthorSummary[]> {
  if (!q.trim()) return [];
  const data = await openalex<{ results: AuthorSummary[] }>("/authors", {
    search: q,
    per_page: perPage,
  });
  return data.results;
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
