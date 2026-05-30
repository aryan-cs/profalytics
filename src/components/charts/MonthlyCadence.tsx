"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface VenueMarker {
  label: string;
  month: number; // 0-11
  count: number;
}

function RotatedVenueLabel(props: {
  text: string;
  anchorEnd?: boolean;
  viewBox?: { x?: number; y?: number };
}) {
  const x = props.viewBox?.x ?? 0;
  const y = props.viewBox?.y ?? 0;
  const anchorX = props.anchorEnd ? x - 4 : x + 4;
  const anchorY = y - 6;
  // Steeper rotation (-60deg) to reduce horizontal extent, plus right-edge
  // labels anchor "end" so they extend up-left instead of clipping off-screen.
  const rotation = props.anchorEnd ? -60 : -60;
  return (
    <text
      x={anchorX}
      y={anchorY}
      fill="var(--foreground)"
      fontSize={11}
      textAnchor={props.anchorEnd ? "end" : "start"}
      transform={`rotate(${rotation} ${anchorX} ${anchorY})`}
    >
      {props.text}
    </text>
  );
}

export default function MonthlyCadence({
  data,
  venues = [],
}: {
  data: Array<{ month: number; count: number }>;
  venues?: VenueMarker[];
}) {
  const rows = data.map((d) => ({ month: MONTHS[d.month], count: d.count }));
  // group venues by month so co-located labels stack on one line
  const byMonth = new Map<number, VenueMarker[]>();
  for (const v of venues) {
    const arr = byMonth.get(v.month) ?? [];
    arr.push(v);
    byMonth.set(v.month, arr);
  }
  return (
    <div className="h-72 -ml-3 -mr-2 text-amber-500 dark:text-amber-400 [&_svg]:overflow-visible">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 110, right: 12, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "var(--border)", opacity: 0.4 }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--foreground)",
            }}
            labelStyle={{ color: "var(--muted)" }}
            formatter={(value) => [String(value), "Papers"]}
          />
          <Bar
            dataKey="count"
            fill="currentColor"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
          {[...byMonth.entries()].map(([m, vs]) => (
            <ReferenceLine
              key={m}
              x={MONTHS[m]}
              stroke="var(--foreground)"
              strokeOpacity={0.4}
              strokeDasharray="3 3"
              ifOverflow="extendDomain"
              label={
                <RotatedVenueLabel
                  text={vs.map((v) => `${v.label} (${v.count})`).join(" · ")}
                  anchorEnd={m >= 8}
                />
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
