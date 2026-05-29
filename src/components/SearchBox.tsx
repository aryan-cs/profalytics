"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function SearchBox({
  initial = "",
  size = "lg",
}: {
  initial?: string;
  size?: "lg" | "md";
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const inputClass =
    size === "lg"
      ? "w-full text-lg px-5 py-4 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
      : "w-full text-base px-4 py-2.5 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition";

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a professor — e.g., Geoffrey Hinton"
          className={inputClass}
          autoFocus={size === "lg"}
        />
      </div>
    </form>
  );
}
