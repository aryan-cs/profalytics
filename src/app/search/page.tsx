import Link from "next/link";
import { searchAuthors, shortId, type AuthorSummary } from "@/lib/openalex";
import { primaryAffiliation } from "@/lib/analytics";
import SearchBox from "@/components/SearchBox";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const search = query
    ? await searchAuthors(query, 25)
    : {
        results: [],
        usedQuery: "",
        droppedTerms: [],
        resolvedInstitution: undefined,
      };
  const { results, usedQuery, droppedTerms, resolvedInstitution } = search;

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-3xl px-6 pt-10 pb-20">
        <div className="mb-8">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors duration-300"
          >
            ← Profalytics
          </Link>
        </div>

        <div className="mb-8">
          <SearchBox initial={query} size="md" />
        </div>

        {query && (
          <div className="text-sm text-muted mb-6">
            {results.length === 0 ? (
              <>No matches for &ldquo;{query}&rdquo;.</>
            ) : (
              <>
                {results.length} candidate{results.length === 1 ? "" : "s"} for{" "}
                &ldquo;{usedQuery}&rdquo;
                {resolvedInstitution && (
                  <>
                    {" "}at{" "}
                    <span className="text-foreground">
                      {resolvedInstitution}
                    </span>
                  </>
                )}{" "}
                — pick the right one:
                {droppedTerms.length > 0 && (
                  <span className="block text-xs mt-1">
                    No matches for the full query — dropped{" "}
                    {droppedTerms.map((t) => `"${t}"`).join(", ")} and re-ranked
                    candidates by affiliation match.
                  </span>
                )}
              </>
            )}
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
  const primary = primaryAffiliation(a);
  const lastAff = primary?.institution.display_name ?? "—";
  const topTopic = a.topics?.[0]?.display_name;

  return (
    <Link
      href={`/author/${id}`}
      className="block rounded-xl border border-border bg-card px-5 py-4 hover:border-accent transition-colors duration-300 group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-medium group-hover:text-accent transition-colors duration-300">
            {a.display_name}
          </div>
          <div className="text-sm text-muted truncate mt-0.5">
            {lastAff}
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
