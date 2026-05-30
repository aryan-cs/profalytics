"use client";

import { useState } from "react";
import { Card } from "./Card";
import MonthlyCadence, { type VenueMarker } from "./charts/MonthlyCadence";

export function SeasonalityCard({
  monthly,
  perYearAverage,
  venuesNoRepos,
  venuesWithRepos,
  yearsBack,
}: {
  monthly: Array<{ month: number; count: number }>;
  perYearAverage: number;
  venuesNoRepos: VenueMarker[];
  venuesWithRepos: VenueMarker[];
  yearsBack: number;
}) {
  const [includeRepos, setIncludeRepos] = useState(false);
  const venues = includeRepos ? venuesWithRepos : venuesNoRepos;
  const footer = venues.length === 0
    ? `No venues with seasonal pattern in the last ${yearsBack} years.`
    : includeRepos
      ? "Lines show the month most papers in each venue were published by this author. Preprint repositories (arXiv etc.) are included."
      : "Lines show the month most papers in each venue were published by this author. Preprint repositories (arXiv etc.) are excluded.";

  return (
    <Card
      title="Seasonality"
      subtitle={`Avg ${perYearAverage.toFixed(1)} works/yr · markers at top venues' modal month`}
      footer={footer}
      headerExtra={
        <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer hover:text-foreground transition-colors duration-200 select-none">
          <input
            type="checkbox"
            checked={includeRepos}
            onChange={(e) => setIncludeRepos(e.target.checked)}
            className="size-3.5 rounded border-border accent-foreground cursor-pointer"
          />
          Include preprints
        </label>
      }
    >
      <MonthlyCadence data={monthly} venues={venues} />
    </Card>
  );
}
