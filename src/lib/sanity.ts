import { createClient } from "@sanity/client";
import type { Article, Category, Writer } from "./types";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = "2026-08-17";

// Public read client (safe for browser + server)
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
});

// Server-only client with write token
export const cmsClient = process.env.SANITY_TOKEN
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      token: process.env.SANITY_TOKEN,
      useCdn: false,
    })
  : sanityClient;

const articleProjection = `{
  _id, title, slug, publishedAt, excerpt, author, headline, trending,
  category->{_id,title,slug,description,color},
  coverImage{asset->{url}},
  body
}`;

// Never let a CMS hiccup take down a page — fall back to empty data.
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export function getCategories(): Promise<Category[]> {
  return safe(
    () =>
      sanityClient.fetch(
        `*[_type=="category"]{_id,title,slug,description,color}|order(title asc)`
      ),
    []
  );
}

export function getArticles(): Promise<Article[]> {
  return safe(
    () =>
      sanityClient.fetch(
        `*[_type=="article"]${articleProjection}|order(publishedAt desc)`
      ),
    []
  );
}

export function getHeadlines(): Promise<Article[]> {
  return safe(
    () =>
      sanityClient.fetch(
        `*[_type=="article" && headline==true]${articleProjection}|order(publishedAt desc)`
      ),
    []
  );
}

export function getTrending(): Promise<Article[]> {
  return safe(
    () =>
      sanityClient.fetch(
        `*[_type=="article" && trending==true]${articleProjection}|order(publishedAt desc)`
      ),
    []
  );
}

export function getArticleBySlug(slug: string): Promise<Article | null> {
  return safe(
    () =>
      sanityClient.fetch(
        `*[_type=="article" && slug.current==$slug][0]${articleProjection}`,
        { slug }
      ),
    null
  );
}

export function getArticlesByCategory(catSlug: string): Promise<Article[]> {
  return safe(
    () =>
      sanityClient.fetch(
        `*[_type=="article" && category->slug.current==$catSlug]${articleProjection}|order(publishedAt desc)`,
        { catSlug }
      ),
    []
  );
}

export function getWriters(): Promise<Writer[]> {
  return safe(
    () =>
      sanityClient.fetch(
        `*[_type=="writer"]{_id,name,role,bio,photo,order}|order(order asc)`
      ),
    []
  );
}
