import Link from "next/link";
import SearchBox from "@/components/SearchBox";

const EXAMPLES = [
  { name: "Geoffrey Hinton", id: "A5108093963" },
  { name: "Fei-Fei Li", id: "A5023888939" },
  { name: "Yann LeCun", id: "A5023888391" },
];

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      <div className="mx-auto w-full max-w-3xl px-6 pt-24 pb-16 flex-1 flex flex-col justify-center">
        <header className="mb-12">
          <div className="text-sm uppercase tracking-[0.2em] text-muted mb-3">
            Profalytics
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1] mb-4">
            Data-informed decisions
            <br />
            about academic mentors.
          </h1>
          <p className="text-muted text-lg leading-relaxed max-w-2xl">
            Search a researcher to see publication cadence, citation trends, top
            co-authors, funders, and a lab-size estimate — pulled live from{" "}
            <a
              href="https://openalex.org"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              OpenAlex
            </a>
            .
          </p>
        </header>

        <SearchBox size="lg" />

        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <span className="text-muted">Try:</span>
          {EXAMPLES.map((e) => (
            <Link
              key={e.id}
              href={`/author/${e.id}`}
              className="text-foreground/80 hover:text-foreground underline-offset-4 hover:underline"
            >
              {e.name}
            </Link>
          ))}
        </div>

        <section className="mt-20 grid sm:grid-cols-3 gap-6 text-sm">
          <Insight title="What you get">
            Yearly publication & citation trends, monthly cadence, top
            co-authors over time, funders & grants, recent papers, and a
            transparent lab-size estimate.
          </Insight>
          <Insight title="What we don't pretend">
            No composite &ldquo;quality score.&rdquo; Mentorship style is invisible to
            bibliometrics — use this alongside conversations, not in place of
            them.
          </Insight>
          <Insight title="Where the data comes from">
            OpenAlex is an open, free academic graph covering ~250M works.
            Funding is read from grant metadata attached to each work.
          </Insight>
        </section>
      </div>
      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        Built on OpenAlex · Not affiliated with any institution
      </footer>
    </main>
  );
}

function Insight({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-foreground font-medium mb-2">{title}</div>
      <p className="text-muted leading-relaxed">{children}</p>
    </div>
  );
}
