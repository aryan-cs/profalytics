"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { paceLabel } from "@/lib/analytics";

interface Row {
  year: number;
  value: number;
  cumulative?: number;
  yoyPercent?: number | null;
  cumGrowthPercent?: number | null;
  spikePaperTitle?: string;
  spikePaperUrl?: string;
  spikePaperCites?: number;
  spikePaperPubYear?: number;
  spikePaperTotalCites?: number;
  spikePaperReason?: "published-near-spike" | "top-contributor-this-year";
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// In ComposedChart with both Bar and Line, Recharts picks a Line-style cursor
// (thin vertical line) and ignores `fill` on the cursor object. This custom
// cursor reads the points Recharts passes and always renders a band-style
// column highlight matching the original bar-cursor look.
function BandCursor(props: {
  points?: Array<{ x?: number; y?: number }>;
  x?: number;
}) {
  const p0 = props.points?.[0];
  const p1 = props.points?.[1];
  const cx = props.x ?? p0?.x ?? 0;
  const top = p0?.y ?? 0;
  const bottom = p1?.y ?? top;
  const height = Math.max(0, Math.abs(bottom - top));
  const bandWidth = 28;
  return (
    <rect
      x={cx - bandWidth / 2}
      y={Math.min(top, bottom)}
      width={bandWidth}
      height={height}
      fill="var(--border)"
      fillOpacity={0.4}
    />
  );
}

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 11px",
  color: "var(--foreground)",
  fontSize: 12,
  lineHeight: 1.45,
  minWidth: 160,
};

function PaceTooltip(props: {
  active?: boolean;
  payload?: Array<{ value?: number | string; payload?: Row; dataKey?: string | number }>;
  label?: string | number;
  yLabel: string;
  showPace: boolean;
  showCumulative: boolean;
}) {
  const { active, payload, label, yLabel, showPace, showCumulative } = props;
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as Row | undefined;
  if (!row) return null;
  const v = Number(row.value ?? payload[0].value ?? 0);
  const pace = showPace ? paceLabel(v) : null;
  const yoy =
    row.yoyPercent != null
      ? `${row.yoyPercent >= 0 ? "+" : ""}${row.yoyPercent.toFixed(0)}% vs ${row.year - 1}`
      : null;
  const showCum = showCumulative && row.cumulative != null;
  return (
    <div style={{ ...TOOLTIP_STYLE, maxWidth: 280 }}>
      <div style={{ color: "var(--muted)" }}>{label}</div>
      <div>
        {v.toLocaleString()} {yLabel}
        {yoy && <span style={{ color: "var(--muted)" }}> ({yoy})</span>}
      </div>
      {pace && <div style={{ color: "var(--muted)" }}>{pace}</div>}
      {showCum && (
        <div style={{ color: "var(--muted)" }}>
          {row.cumulative!.toLocaleString()} cumulative
        </div>
      )}
      {row.spikePaperTitle && (
        <div
          style={{
            marginTop: 6,
            paddingTop: 6,
            borderTop: "1px solid var(--border)",
            color: "var(--muted)",
          }}
        >
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
            Likely driver
          </div>
          <div style={{ color: "var(--foreground)", lineHeight: 1.35 }}>
            {row.spikePaperTitle}
          </div>
          <div style={{ fontSize: 11, marginTop: 2 }}>
            {row.spikePaperReason === "published-near-spike" && row.spikePaperPubYear != null && row.spikePaperTotalCites != null ? (
              <>
                Published {row.spikePaperPubYear} · {row.spikePaperTotalCites.toLocaleString()} citations total
              </>
            ) : row.spikePaperCites != null ? (
              <>
                {row.spikePaperCites.toLocaleString()} of {v.toLocaleString()} citations this year
              </>
            ) : null}
            <br />
            Click the bar to open the paper
          </div>
        </div>
      )}
    </div>
  );
}

export default function YearlyChart({
  data,
  tint = "text-indigo-500 dark:text-indigo-400",
  yLabel,
  showPace = false,
  showCumulative = false,
}: {
  data: Row[];
  tint?: string;
  yLabel: string;
  showPace?: boolean;
  showCumulative?: boolean;
}) {
  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-muted">
        No data
      </div>
    );
  }
  return (
    <div className={`h-56 -ml-3 -mr-2 ${tint}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            width={52}
            allowDecimals={false}
            tickFormatter={(v) => formatCompact(Number(v))}
          />
          {showCumulative && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
              width={48}
              allowDecimals={false}
              tickFormatter={(v) => formatCompact(Number(v))}
            />
          )}
          <Tooltip
            cursor={showCumulative ? <BandCursor /> : { fill: "var(--border)", opacity: 0.4 }}
            content={(props) => {
              const p = props as unknown as {
                active?: boolean;
                payload?: Array<{ value?: number | string; payload?: Row; dataKey?: string | number }>;
                label?: string | number;
              };
              return (
                <PaceTooltip
                  active={p.active}
                  payload={p.payload}
                  label={p.label}
                  yLabel={yLabel}
                  showPace={showPace}
                  showCumulative={showCumulative}
                />
              );
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="value"
            fill="currentColor"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
            cursor="pointer"
            onClick={(payload) => {
              const url = (payload as { spikePaperUrl?: string })?.spikePaperUrl;
              if (url && typeof window !== "undefined") {
                window.open(url, "_blank", "noopener,noreferrer");
              }
            }}
          />
          {showCumulative && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              stroke="var(--foreground)"
              strokeOpacity={0.55}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
