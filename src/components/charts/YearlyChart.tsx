"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Row {
  year: number;
  value: number;
}

export default function YearlyChart({
  data,
  tint = "text-indigo-500 dark:text-indigo-400",
  yLabel,
}: {
  data: Row[];
  tint?: string;
  yLabel: string;
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
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            width={52}
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
            formatter={(value) => [String(value), yLabel]}
          />
          <Bar
            dataKey="value"
            fill="currentColor"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
