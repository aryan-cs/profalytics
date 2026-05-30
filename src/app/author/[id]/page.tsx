import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthor, getAuthorWorks, getTopCitedWorks, shortId } from "@/lib/openalex";
import {
  buildYearStats,
  topCoauthors,
  topFunders,
  estimateLabSize,
  publicationCadence,
  rankedAffiliations,
  topVenues,
  shortenVenue,
  scholarSearchUrl,
  buildCitationSpikes,
  currentPublicationRate,
} from "@/lib/analytics";
import { collectExternalLinks, getOrcidUrls } from "@/lib/external-links";
import { Card } from "@/components/Card";
import YearlyChart from "@/components/charts/YearlyChart";
import CoauthorBars from "@/components/charts/CoauthorBars";
import { SeasonalityCard } from "@/components/SeasonalityCard";
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
  let topCited;
  try {
    [author, works, topCited] = await Promise.all([
      getAuthor(id),
      getAuthorWorks(id, { yearsBack: YEARS_BACK, perPage: 200 }),
      getTopCitedWorks(id, 25),
    ]);
  } catch (e) {
    if (e instanceof Error && e.message.includes("404")) notFound();
    throw e;
  }

  // ORCID lookup is sequential because we don't know the ORCID until author loads.
  const orcidLinks = await getOrcidUrls(author.orcid);
  const externalLinks = collectExternalLinks(author, orcidLinks);

  const yearStats = buildYearStats(author);
  const citationSpikes = buildCitationSpikes(topCited, yearStats);
  const coauthors = topCoauthors(works, author.id, 10);
  const funders = topFunders(works, 8);
  const lab = estimateLabSize(works, author.id);
  const cadence = publicationCadence(works);
  const pubRate = currentPublicationRate(works);
  const toMarkers = (vs: ReturnType<typeof topVenues>) =>
    vs.map((v) => ({
      label: shortenVenue(v.name),
      month: v.modalMonth,
      count: v.count,
    }));
  const venuesNoRepos = toMarkers(topVenues(works, { limit: 3 }));
  const venuesWithRepos = toMarkers(
    topVenues(works, { limit: 3, includeRepositories: true }),
  );
  const recentWorks = [...works]
    .sort((a, b) => (b.publication_date > a.publication_date ? 1 : -1))
    .slice(0, 10);

  const rankedAffs = rankedAffiliations(author);
  const primaryAff = rankedAffs[0] ?? null;
  const secondaryAffs = rankedAffs.slice(1, 5);
  const currentAff = primaryAff?.institution.display_name ?? "—";
  const primaryAffYearsLabel = primaryAff
    ? `${Math.min(...primaryAff.years)}–${Math.max(...primaryAff.years)}`
    : null;
  const scholarUrl = scholarSearchUrl(author);

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-6xl px-6 pt-8 pb-20">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.2em] text-muted hover:text-foreground transition-colors duration-300"
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
                <a
                  href={scholarUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline underline-offset-4 decoration-2 transition-colors duration-300"
                  title="Open Google Scholar search in a new tab"
                >
                  {author.display_name}
                </a>
              </h1>
              <p className="text-muted mt-1">
                {currentAff}
                {primaryAffYearsLabel ? `, ${primaryAffYearsLabel}` : ""}
              </p>
              {secondaryAffs.length > 0 && (
                <p className="text-xs text-muted mt-1">
                  Also affiliated with{" "}
                  {secondaryAffs.map((a, i) => (
                    <span key={a.institution.id}>
                      {a.institution.display_name} ({Math.min(...a.years)}–
                      {Math.max(...a.years)})
                      {i < secondaryAffs.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </p>
              )}
              <p className="text-xs text-muted mt-2 flex flex-wrap gap-x-3 gap-y-1">
                <ExtLinkAnchor label="Google Scholar (search)" url={scholarUrl} />
                {author.orcid && (
                  <ExtLinkAnchor label="ORCID" url={author.orcid} />
                )}
                <ExtLinkAnchor
                  label="OpenAlex"
                  url={`https://openalex.org/${shortId(author.id)}`}
                />
                {externalLinks.map((l) => (
                  <ExtLinkAnchor key={l.url} label={l.label} url={l.url} />
                ))}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-6">
            <KPI
              label="Works"
              value={fmt(author.works_count)}
              info="Total scholarly outputs indexed in OpenAlex — journal articles, conference papers, preprints, book chapters, datasets, and more. Not filtered by venue type."
            />
            <KPI
              label="Citations"
              value={fmt(author.cited_by_count)}
              info="Sum of citations to all of this author's works, counted from other OpenAlex-indexed works. Google Scholar typically reports 1.5–3× higher because it indexes theses, books, and gray literature that OpenAlex doesn't."
            />
            <KPI
              label="h-index"
              value={fmt(author.summary_stats?.h_index ?? 0)}
              info="Largest number h such that the author has h papers each cited at least h times. Rewards consistent impact over a single viral hit. Computed on OpenAlex citation counts, so will be lower than Scholar's h-index."
            />
            <KPI
              label="i10-index"
              value={fmt(author.summary_stats?.i10_index ?? 0)}
              info="Number of papers with at least 10 citations each. A coarse 'how many of their papers actually got noticed?' signal."
            />
            <KPI
              label="2yr mean cite"
              value={(author.summary_stats?.["2yr_mean_citedness"] ?? 0).toFixed(1)}
              info="Average citations per work published in the last two years. A recency-weighted impact signal — high values mean their newest output is landing, not just their classics."
            />
            <KPI
              label="Conf / yr"
              value={fmt(pubRate.conference)}
              info="Conference papers in the last 365 days (trailing window). Counts: (1) works tagged as conference, (2) venue names matching known conferences (NeurIPS, CVPR, ICCV, ICML, ICLR, ACL, AAAI, IJCAI, CoRL, SIGGRAPH, USENIX, OSDI, SOSP, CHI, UIST, VLDB, etc.), and (3) arXiv CS preprints — because OpenAlex usually indexes the arXiv version 6–12 months before the conference version, so for CS researchers arXiv preprints are the best leading indicator of conference-bound output."
            />
            <KPI
              label="All / yr"
              value={fmt(pubRate.allWorks)}
              info="All works published in the last 365 days — journals, conferences, preprints, book chapters, etc. Trailing window means it's stable across the calendar year, not biased low in January."
            />
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          <Card
            title="Publications per year"
            subtitle="Bars are per-year; line is cumulative total"
          >
            <YearlyChart
              data={yearStats.map((y) => ({
                year: y.year,
                value: y.works,
                cumulative: y.cumulativeWorks,
                yoyPercent: y.yoyWorksPercent,
                cumGrowthPercent: y.cumulativeWorksGrowthPercent,
              }))}
              yLabel="Papers"
              showPace
              showCumulative
            />
          </Card>
          <Card
            title="Citations received per year"
            subtitle="Bars are per-year; line is cumulative total"
          >
            <YearlyChart
              data={yearStats.map((y) => {
                const spike = citationSpikes.get(y.year);
                return {
                  year: y.year,
                  value: y.citations,
                  cumulative: y.cumulativeCitations,
                  yoyPercent: y.yoyCitationsPercent,
                  cumGrowthPercent: y.cumulativeCitationsGrowthPercent,
                  spikePaperTitle: spike?.title,
                  spikePaperUrl: spike?.url,
                  spikePaperCites: spike?.citesInYear ?? undefined,
                  spikePaperPubYear: spike?.publicationYear,
                  spikePaperTotalCites: spike?.totalCites,
                  spikePaperReason: spike?.reason,
                };
              })}
              tint="text-emerald-600 dark:text-emerald-400"
              yLabel="Citations"
              showCumulative
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
                id: c.id,
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

        <Card
          className="mb-5"
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
                  className="block group transition-colors duration-300"
                >
                  <div className="text-sm font-medium group-hover:underline transition-colors duration-300">
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

          <SeasonalityCard
            monthly={cadence.monthly}
            perYearAverage={cadence.perYearAverage}
            venuesNoRepos={venuesNoRepos}
            venuesWithRepos={venuesWithRepos}
            yearsBack={YEARS_BACK}
          />
        </div>

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

function ExtLinkAnchor({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="hover:text-foreground underline-offset-4 hover:underline transition-colors duration-300"
    >
      {label}
    </a>
  );
}

function KPI({
  label,
  value,
  info,
}: {
  label: string;
  value: string;
  info: string;
}) {
  return (
    <div className="relative rounded-xl border border-border bg-card px-4 py-3">
      <InfoBadge label={label} content={info} />
      <div className="text-xl sm:text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted mt-0.5">
        {label}
      </div>
    </div>
  );
}

function InfoBadge({ label, content }: { label: string; content: string }) {
  return (
    <div className="absolute top-2 right-2 group/info">
      <button
        type="button"
        aria-label={`About the ${label} metric`}
        className="size-4 rounded-full border border-border text-muted hover:text-foreground hover:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus-visible:text-foreground focus-visible:border-foreground flex items-center justify-center text-[10px] leading-none italic font-serif transition"
      >
        i
      </button>
      <div
        role="tooltip"
        className="pointer-events-none opacity-0 translate-y-1 group-hover/info:opacity-100 group-hover/info:translate-y-0 group-focus-within/info:opacity-100 group-focus-within/info:translate-y-0 absolute top-6 right-0 z-20 w-60 rounded-lg border border-border bg-card p-3 text-[11px] leading-relaxed text-muted shadow-lg transition-all duration-150"
      >
        {content}
      </div>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return new Intl.NumberFormat("en-US").format(n);
}
