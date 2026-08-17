import type { Metadata } from "next";
import Link from "next/link";
import { getArticles, getCategories } from "@/lib/sanity";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "News Categories",
  description:
    "Browse Free-Fall News by category — School News, World News, Hong Kong News, Educational, Sports, AI, Business and more.",
};

export default async function CategoriesPage() {
  const [categories, articles] = await Promise.all([
    getCategories(),
    getArticles(),
  ]);
  const counts = new Map<string, number>();
  for (const a of articles) {
    if (a.category?.slug) {
      counts.set(a.category.slug, (counts.get(a.category.slug) || 0) + 1);
    }
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">News Categories</h1>
      <p className="mt-1 text-slate-500">
        Events, updates and everything in between.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c._id}
            href={`/categories/${c.slug}`}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h2 className="font-bold group-hover:text-brand">{c.title}</h2>
            {c.description && (
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                {c.description}
              </p>
            )}
            <p className="mt-3 text-xs font-semibold text-brand">
              {counts.get(c.slug) || 0} article{(counts.get(c.slug) || 0) === 1 ? "" : "s"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
