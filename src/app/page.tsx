import Link from "next/link";
import type { Metadata } from "next";
import Hero from "@/components/Hero";
import HeadlineShowcase from "@/components/HeadlineShowcase";
import ArticleCard from "@/components/ArticleCard";
import NewsletterSignup from "@/components/NewsletterSignup";
import { getArticles, getCategories, getHeadlines, getTrending } from "@/lib/sanity";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Free-Fall News",
  description:
    "Your source for the latest news in school and world news, made by students for students.",
};

export default async function Home() {
  const [headlines, trending, articles, categories] = await Promise.all([
    getHeadlines(),
    getTrending(),
    getArticles(),
    getCategories(),
  ]);

  const newest = articles.filter(
    (a) => !headlines.some((h) => h._id === a._id)
  );
  const showcase = headlines.length ? headlines : newest.slice(0, 4);
  const grid = headlines.length ? newest : newest.slice(4);

  return (
    <>
      <Hero />
      <HeadlineShowcase articles={showcase} />

      <section id="news" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Our Newest Articles</h2>
        <p className="text-slate-500">
          Catch up on our most recent articles (we publish once a day / more).
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {grid.slice(0, 9).map((a) => (
            <ArticleCard key={a._id} article={a} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/all-news"
            className="inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand/90"
          >
            View all news
          </Link>
        </div>
      </section>

      {trending.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-2xl font-bold">🔥 Trending News</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trending.slice(0, 6).map((a) => (
              <ArticleCard key={a._id} article={a} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Browse by Category</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {categories.map((c) => (
            <Link
              key={c._id}
              href={`/categories/${c.slug}`}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium transition hover:border-brand hover:text-brand"
            >
              {c.title}
            </Link>
          ))}
        </div>
      </section>

      <NewsletterSignup />
    </>
  );
}
