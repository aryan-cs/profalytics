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
  id: string;
  name: string;
  count: number;
  years: string;
}

function AuthorTick(props: {
  x?: number | string;
  y?: number | string;
  payload?: { value: string };
  rows: Row[];
}) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const { payload, rows } = props;
  const name = payload?.value ?? "";
  const row = rows.find((r) => r.name === name);
  const lines = name.length > 30 ? name.split(/\s+/) : [name];
  const text = (
    <text
      x={x}
      y={y}
      textAnchor="end"
      fill="currentColor"
      fontSize={12}
      style={{ color: "var(--foreground)" }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 4 - (lines.length - 1) * 7 : 14}>
          {line}
        </tspan>
      ))}
    </text>
  );
  if (!row) return text;
  return (
    <a href={`/author/${row.id}`} target="_blank" rel="noreferrer">
      {text}
    </a>
  );
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
            width={200}
            tick={(p) => <AuthorTick {...p} rows={data} />}
            tickLine={false}
            axisLine={false}
            interval={0}
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
