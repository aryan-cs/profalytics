import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthor, getAuthorWorks, shortId } from "@/lib/openalex";
import {
  buildYearStats,
  topCoauthors,
  topFunders,
  estimateLabSize,
  publicationCadence,
  mostRecentAffiliation,
} from "@/lib/analytics";
import { Card } from "@/components/Card";
import YearlyChart from "@/components/charts/YearlyChart";
import CoauthorBars from "@/components/charts/CoauthorBars";
import MonthlyCadence from "@/components/charts/MonthlyCadence";
import SearchBox from "@/components/SearchBox";

export const dynamic = "force-dynamic";

const YEARS_BACK = 10;

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let author;
  let works;
  try {
    [author, works] = await Promise.all([
      getAuthor(id),
      getAuthorWorks(id, { yearsBack: YEARS_BACK, perPage: 200 }),
    ]);
  } catch (e) {
    if (e instanceof Error && e.message.includes("404")) notFound();
    throw e;
  }

  const yearStats = buildYearStats(author);
  const coauthors = topCoauthors(works, author.id, 10);
  const funders = topFunders(works, 8);
  const lab = estimateLabSize(works, author.id);
  const cadence = publicationCadence(works);
  const recentWorks = [...works]
    .sort((a, b) => (b.publication_date > a.publication_date ? 1 : -1))
    .slice(0, 10);

  const mostRecentAff = mostRecentAffiliation(author);
  const currentAff =
    author.last_known_institutions?.[0]?.display_name ??
    mostRecentAff?.institution.display_name ??
    "—";
  const country =
    author.last_known_institutions?.[0]?.country_code ??
    mostRecentAff?.institution.country_code ??
    null;
  const currentAffYear = mostRecentAff
    ? Math.max(...mostRecentAff.years)
    : null;

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-6xl px-6 pt-8 pb-20">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.2em] text-muted hover:text-foreground"
          >
            ← Profalytics
          </Link>
          <div className="w-full max-w-sm">
            <SearchBox size="md" />
          </div>
        </div>

        <header className="mb-10">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-3">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                {author.display_name}
              </h1>
              <p className="text-muted mt-1">
                {currentAff}
                {country ? ` · ${country}` : ""}
                {currentAffYear ? ` · most recent ${currentAffYear}` : ""}
                {author.orcid && (
                  <>
                    {" · "}
                    <a
                      href={author.orcid}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-foreground underline-offset-4 hover:underline"
                    >
                      ORCID
                    </a>
                  </>
                )}
                {" · "}
                <a
                  href={`https://openalex.org/${shortId(author.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground underline-offset-4 hover:underline"
                >
                  OpenAlex
                </a>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-6">
            <KPI label="Works" value={fmt(author.works_count)} />
            <KPI label="Citations" value={fmt(author.cited_by_count)} />
            <KPI label="h-index" value={fmt(author.summary_stats?.h_index ?? 0)} />
            <KPI label="i10-index" value={fmt(author.summary_stats?.i10_index ?? 0)} />
            <KPI
              label="2yr mean cite"
              value={(author.summary_stats?.["2yr_mean_citedness"] ?? 0).toFixed(1)}
            />
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          <Card
            title="Publications per year"
            subtitle="From OpenAlex counts_by_year (all-time)"
          >
            <YearlyChart
              data={yearStats.map((y) => ({ year: y.year, value: y.works }))}
              yLabel="Papers"
            />
          </Card>
          <Card
            title="Citations received per year"
            subtitle="Citations recorded to all works in each year"
          >
            <YearlyChart
              data={yearStats.map((y) => ({ year: y.year, value: y.citations }))}
              tint="text-emerald-600 dark:text-emerald-400"
              yLabel="Citations"
            />
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 mb-5">
          <Card
            className="lg:col-span-2"
            title="Top co-authors"
            subtitle={`Last ${YEARS_BACK} years · sample of up to ${works.length} works`}
            footer="Co-authorship doesn't imply mentorship. Frequent ties often signal lab members, collaborators, or grant partners — check the year range to tell them apart."
          >
            <CoauthorBars
              data={coauthors.map((c) => ({
                name: c.name,
                count: c.count,
                years: `${c.firstYear}–${c.lastYear}`,
              }))}
            />
          </Card>

          <Card
            title="Lab-size estimate"
            subtitle="Distinct first-authors per year"
            footer={
              lab.applicable
                ? `Heuristic: count distinct first-authors of works where ${author.display_name} is last author. Breaks for fields without PI-last-author convention (math, theory CS).`
                : `Less than 20% of recent works have ${author.display_name} as last author — the PI-last-author heuristic may not apply in this field.`
            }
          >
            <div className="flex items-baseline gap-3 mb-4">
              <div className="text-4xl font-semibold tabular-nums">
                {lab.medianRecent}
              </div>
              <div className="text-sm text-muted">
                median over last 5 years
              </div>
            </div>
            <div className="text-xs text-muted mb-3">
              {lab.totalDistinctFirstAuthors} distinct first-authors across{" "}
              {lab.totalLastAuthorWorks} last-author papers in the last{" "}
              {YEARS_BACK} years.
            </div>
            <ul className="space-y-1.5 text-sm">
              {lab.byYear.slice(-6).reverse().map((y) => (
                <li key={y.year} className="flex justify-between">
                  <span className="text-muted tabular-nums">{y.year}</span>
                  <span className="tabular-nums">{y.firstAuthors}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 mb-5">
          <Card
            title="Funders & grants"
            subtitle="Aggregated from grant metadata on each work"
            className="lg:col-span-2"
            footer={
              funders.length === 0
                ? undefined
                : "Grant data is self-reported and incomplete across OpenAlex — absence doesn't mean unfunded."
            }
          >
            {funders.length === 0 ? (
              <div className="text-sm text-muted py-6 text-center">
                No funder metadata recorded for recent works.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {funders.map((f) => (
                  <li key={f.id} className="py-2.5 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{f.name}</div>
                      {f.awards.length > 0 && (
                        <div className="text-xs text-muted mt-0.5 truncate">
                          {f.awards.slice(0, 3).join(" · ")}
                          {f.awards.length > 3 ? ` +${f.awards.length - 3} more` : ""}
                        </div>
                      )}
                    </div>
                    <div className="text-sm tabular-nums shrink-0">
                      {f.count} {f.count === 1 ? "work" : "works"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Seasonality"
            subtitle={`Avg ${cadence.perYearAverage.toFixed(1)} works/yr (last ${YEARS_BACK})`}
          >
            <MonthlyCadence data={cadence.monthly} />
          </Card>
        </div>

        <Card
          title="Recent works"
          subtitle={`Most recent ${recentWorks.length} of ${works.length} works in the last ${YEARS_BACK} years`}
        >
          <ul className="divide-y divide-border">
            {recentWorks.map((w) => (
              <li key={w.id} className="py-3">
                <a
                  href={w.primary_location?.landing_page_url ?? `https://openalex.org/${shortId(w.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block group"
                >
                  <div className="text-sm font-medium group-hover:underline">
                    {w.title ?? w.display_name ?? "Untitled"}
                  </div>
                  <div className="text-xs text-muted mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>{w.publication_date || w.publication_year}</span>
                    {w.primary_location?.source?.display_name && (
                      <span>{w.primary_location.source.display_name}</span>
                    )}
                    <span>{w.cited_by_count} citations</span>
                    {w.open_access?.is_oa && (
                      <span className="text-emerald-600 dark:text-emerald-400">Open access</span>
                    )}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </Card>

        {author.topics && author.topics.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs uppercase tracking-[0.18em] text-muted mb-3">
              Research topics
            </h2>
            <div className="flex flex-wrap gap-2">
              {author.topics.slice(0, 20).map((t) => (
                <span
                  key={t.id}
                  className="text-xs px-2.5 py-1 rounded-full border border-border bg-card text-foreground/80"
                  title={`${t.count} works`}
                >
                  {t.display_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-xl sm:text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted mt-0.5">
        {label}
      </div>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return new Intl.NumberFormat("en-US").format(n);
}

