import Link from "next/link";
import { searchAuthors, shortId, type AuthorSummary } from "@/lib/openalex";
import { mostRecentAffiliation } from "@/lib/analytics";
import SearchBox from "@/components/SearchBox";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query ? await searchAuthors(query, 15) : [];

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-3xl px-6 pt-10 pb-20">
        <div className="mb-8">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.2em] text-muted hover:text-foreground"
          >
            ← Profalytics
          </Link>
        </div>

        <div className="mb-8">
          <SearchBox initial={query} size="md" />
        </div>

        {query && (
          <div className="text-sm text-muted mb-6">
            {results.length === 0
              ? `No matches for "${query}".`
              : `${results.length} candidate${results.length === 1 ? "" : "s"} for "${query}" — pick the right one:`}
          </div>
        )}

        <ul className="space-y-3">
          {results.map((a) => (
            <li key={a.id}>
              <CandidateCard a={a} />
            </li>
          ))}
        </ul>

        {query && results.length > 0 && (
          <p className="mt-10 text-xs text-muted leading-relaxed">
            Multiple researchers can share a name — use the institution, works
            count, h-index, and recent affiliation to disambiguate before
            clicking through.
          </p>
        )}
      </div>
    </main>
  );
}

function CandidateCard({ a }: { a: AuthorSummary }) {
  const id = shortId(a.id);
  const recent = mostRecentAffiliation(a);
  const lastAff =
    a.last_known_institutions?.[0]?.display_name ??
    recent?.institution.display_name ??
    "—";
  const country =
    a.last_known_institutions?.[0]?.country_code ??
    recent?.institution.country_code ??
    null;
  const topTopic = a.topics?.[0]?.display_name;

  return (
    <Link
      href={`/author/${id}`}
      className="block rounded-xl border border-border bg-card px-5 py-4 hover:border-accent transition group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-medium group-hover:text-accent">
            {a.display_name}
          </div>
          <div className="text-sm text-muted truncate mt-0.5">
            {lastAff}
            {country ? ` · ${country}` : ""}
          </div>
          {topTopic && (
            <div className="text-xs text-muted mt-2">
              Works mostly on <span className="text-foreground">{topTopic}</span>
            </div>
          )}
        </div>
        <div className="flex gap-4 text-right shrink-0">
          <Stat label="works" value={a.works_count} />
          <Stat label="h-index" value={a.summary_stats?.h_index ?? 0} />
          <Stat label="cited" value={formatCompact(a.cited_by_count)} />
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-base font-medium tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
