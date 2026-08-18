import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import { formatDate } from "@/components/ArticleCard";
import { getArticleBySlug, getArticles } from "@/lib/sanity";
import type { Article } from "@/lib/types";

export const revalidate = 60;
// Static export requires all dynamic routes to be prerendered (generateStaticParams).
export const dynamicParams = false;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://freefall-news.web.app";

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/article/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      url: `${siteUrl}/article/${article.slug}`,
      images: article.coverImage?.asset?.url
        ? [{ url: article.coverImage.asset.url }]
        : [],
    },
  };
}

const ptComponents = {
  block: {
    h2: ({ children }: any) => (
      <h2 className="mb-3 mt-8 text-2xl font-bold">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="mb-2 mt-6 text-xl font-semibold">{children}</h3>
    ),
    normal: ({ children }: any) => (
      <p className="mb-4 leading-relaxed text-slate-800">{children}</p>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="mb-4 border-l-4 border-brand pl-4 italic text-slate-600">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }: any) => (
      <ul className="mb-4 list-disc pl-6">{children}</ul>
    ),
    number: ({ children }: any) => (
      <ol className="mb-4 list-decimal pl-6">{children}</ol>
    ),
  },
  marks: {
    link: ({ children, value }: any) => (
      <a
        href={value?.href}
        className="text-brand underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    em: ({ children }: any) => <em>{children}</em>,
    strong: ({ children }: any) => <strong>{children}</strong>,
  },
};

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = (await getArticleBySlug(slug)) as Article | null;
  if (!article) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    datePublished: article.publishedAt,
    description: article.excerpt,
    author: { "@type": "Organization", name: "Free-Fall News" },
    publisher: {
      "@type": "Organization",
      name: "Free-Fall News",
      url: siteUrl,
    },
    mainEntityOfPage: `${siteUrl}/article/${article.slug}`,
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        {article.category && (
          <Link
            href={`/categories/${article.category.slug}`}
            className="rounded-full bg-brand-bg px-3 py-1 font-medium text-brand"
          >
            {article.category.title}
          </Link>
        )}
        <time>{formatDate(article.publishedAt)}</time>
        {article.author && <span>by {article.author}</span>}
      </div>
      <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
        {article.title}
      </h1>
      {article.excerpt && (
        <p className="mt-4 text-lg text-slate-600">{article.excerpt}</p>
      )}
      {article.coverImage?.asset?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.coverImage.asset.url}
          alt={article.title}
          className="mt-6 w-full rounded-2xl object-cover"
        />
      )}
      <div className="mt-8">
        <PortableText value={article.body || []} components={ptComponents} />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}
