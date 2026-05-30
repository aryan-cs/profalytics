import Link from "next/link";
import SearchBox from "@/components/SearchBox";

const EXAMPLES = [
  { name: "Geoffrey Hinton", id: "A5108093963" },
  { name: "Fei-Fei Li", id: "A5100450462" },
  { name: "Yann LeCun", id: "A5001226970" },
];

export default function Home() {
  return (
    <main className="flex-1 flex flex-col h-[100dvh]">
      <div className="mx-auto w-full max-w-3xl px-6 flex-1 flex flex-col justify-center">
        <header className="mb-7">
          <div className="text-xs uppercase tracking-[0.2em] text-muted mb-2">
            Profalytics
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.1] mb-3">
            Data-informed decisions
            <br />
            about academic mentors.
          </h1>
          <p className="text-muted text-base leading-relaxed max-w-2xl">
            Search a researcher to see publication cadence, citation trends, top
            co-authors, funders, and a lab-size estimate — pulled live from{" "}
            <a
              href="https://openalex.org"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground transition-colors duration-300"
            >
              OpenAlex
            </a>
            .
          </p>
        </header>

        <SearchBox size="lg" />

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <span className="text-muted">Try:</span>
          {EXAMPLES.map((e) => (
            <Link
              key={e.id}
              href={`/author/${e.id}`}
              className="text-foreground/80 hover:text-foreground underline-offset-4 hover:underline transition-colors duration-300"
            >
              {e.name}
            </Link>
          ))}
        </div>

        <section className="mt-10 grid sm:grid-cols-3 gap-5 text-xs">
          <Insight title="What you get">
            Yearly trends, monthly cadence, top co-authors, funders, recent
            papers, and a transparent lab-size estimate.
          </Insight>
          <Insight title="What this isn't">
            No composite &ldquo;quality score.&rdquo; Mentorship style is invisible
            to bibliometrics.
          </Insight>
          <Insight title="Where the data comes from">
            OpenAlex — an open academic graph of ~250M works. Funding from
            per-work grant metadata.
          </Insight>
        </section>
      </div>
      <footer className="border-t border-border py-3 text-center text-xs text-muted shrink-0">
        Built on OpenAlex · Not affiliated with any institution
      </footer>
    </main>
  );
}

function Insight({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-foreground font-medium mb-1.5 text-sm">{title}</div>
      <p className="text-muted leading-relaxed">{children}</p>
    </div>
  );
}
