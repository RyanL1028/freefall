import Fuse from "fuse.js";
import type { Article } from "./types";

const options = {
  keys: ["title", "excerpt", "author", "category.title"],
  threshold: 0.35,
  ignoreLocation: true,
};

export function searchArticles(
  articles: Article[],
  query: string
): Article[] {
  if (!query.trim()) return articles;
  const fuse = new Fuse(articles, options);
  return fuse.search(query).map((r) => r.item);
}
