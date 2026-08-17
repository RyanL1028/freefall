"use client";

import { useMemo, useState } from "react";
import ArticleCard from "./ArticleCard";
import { searchArticles } from "@/lib/search";
import type { Article } from "@/lib/types";

export default function AllNewsList({ articles }: { articles: Article[] }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => searchArticles(articles, q), [articles, q]);

  return (
    <div>
      <div className="relative max-w-2xl">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
          🔍
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search articles…"
          className="w-full rounded-full border border-slate-300 py-3 pl-12 pr-4 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {q
          ? `${results.length} result${results.length === 1 ? "" : "s"} for "${q}"`
          : `${articles.length} article${articles.length === 1 ? "" : "s"}`}
      </p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((a) => (
          <ArticleCard key={a._id} article={a} />
        ))}
      </div>
      {!results.length && (
        <p className="py-10 text-center text-slate-500">
          No articles found. Try a different search.
        </p>
      )}
    </div>
  );
}
