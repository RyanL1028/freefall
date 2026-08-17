import Link from "next/link";
import type { Article } from "@/lib/types";

export function formatDate(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {article.coverImage?.asset?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.coverImage.asset.url}
          alt={article.title}
          loading="lazy"
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="h-44 w-full bg-gradient-to-br from-brand to-brand-light" />
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <time>{formatDate(article.publishedAt)}</time>
          {article.category && (
            <span className="rounded-full bg-brand-bg px-2 py-0.5 font-medium text-brand">
              {article.category.title}
            </span>
          )}
        </div>
        <h3 className="mt-2 font-semibold leading-snug group-hover:text-brand">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="mt-1 line-clamp-3 text-sm text-slate-600">
            {article.excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}
