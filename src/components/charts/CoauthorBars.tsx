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
  name: string;
  count: number;
  years: string;
}

export default function CoauthorBars({ data }: { data: Row[] }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted">
        No co-author data available
      </div>
    );
  }
  return (
    <div
      className="-ml-2 -mr-2 text-indigo-500 dark:text-indigo-400"
      style={{ height: Math.max(220, data.length * 32 + 32) }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fontSize: 12, fill: "var(--foreground)" }}
            tickLine={false}
            axisLine={false}
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
            formatter={(value, _name, item) => {
              const row = (item as { payload: Row }).payload;
              return [`${value} papers (${row.years})`, "Co-authored"];
            }}
          />
          <Bar
            dataKey="count"
            fill="currentColor"
            radius={[0, 3, 3, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
