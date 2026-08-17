import Link from "next/link";
import ArticleCard, { formatDate } from "./ArticleCard";
import type { Article } from "@/lib/types";

export default function HeadlineShowcase({
  articles,
}: {
  articles: Article[];
}) {
  if (!articles.length) return null;
  const [main, ...rest] = articles;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <Link
        href={`/article/${main.slug}`}
        className="group grid gap-6 overflow-hidden rounded-3xl bg-slate-900 p-6 text-white lg:grid-cols-2 lg:p-10"
      >
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
            <span className="rounded-full bg-brand px-2.5 py-1 font-bold text-slate-900">
              Headline
            </span>
            <time className="text-slate-400">{formatDate(main.publishedAt)}</time>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold leading-tight lg:text-4xl">
            {main.title}
          </h2>
          {main.excerpt && (
            <p className="mt-3 text-slate-300">{main.excerpt}</p>
          )}
          <span className="mt-5 font-semibold text-brand-light">
            Read more →
          </span>
        </div>
        {main.coverImage?.asset?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={main.coverImage.asset.url}
            alt={main.title}
            className="h-64 w-full rounded-2xl object-cover lg:h-full"
          />
        )}
      </Link>
      {rest.length > 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.slice(0, 3).map((a) => (
            <ArticleCard key={a._id} article={a} />
          ))}
        </div>
      )}
    </section>
  );
}
