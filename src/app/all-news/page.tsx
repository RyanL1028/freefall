import type { Metadata } from "next";
import AllNewsList from "@/components/AllNewsList";
import { getArticles } from "@/lib/sanity";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "All News",
  description:
    "Every Free-Fall News article — world news, Hong Kong news, school news and more. Searchable.",
};

export default async function AllNewsPage() {
  const articles = await getArticles();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">All News</h1>
      <p className="mt-1 text-slate-500">Insights, Analysis, and Commentary</p>
      <div className="mt-6">
        <AllNewsList articles={articles} />
      </div>
    </div>
  );
}
