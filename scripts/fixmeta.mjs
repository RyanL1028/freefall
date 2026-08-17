// Fixes article titles + publish dates using the old site's listing pages,
// which contain the clean title and the real publish date for each article
// (the migration's per-page extraction grabbed the wrong date/title for some).
//
// Usage: node --env-file=.env.local scripts/fixmeta.mjs
import { createClient } from "@sanity/client";
import * as cheerio from "cheerio";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2026-08-17",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

const BASE = "https://freefall.mystrikingly.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { "X-Return-Format": "html", "x-no-cache": "true" },
  });
  const text = await res.text();
  if (!res.ok || !text || text.length < 2000) throw new Error("jina fetch failed");
  return text;
}

const MONTHS =
  /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/;

function parseListing(html) {
  const map = {};
  for (const m of html.matchAll(/\/blog\/([a-z0-9-]+)/g)) {
    const slug = m[1];
    if (!map[slug]) map[slug] = { title: "", date: "" };
  }
  const $ = cheerio.load(html);
  $('a[href*="/blog/"]').each((_i, el) => {
    const m = ($(el).attr("href") || "").match(/\/blog\/([a-z0-9-]+)/);
    if (!m) return;
    const slug = m[1];
    const title = ($(el).attr("aria-label") || $(el).text().trim()).trim();
    if (title && !map[slug].title) map[slug].title = title;
  });
  // Associate each entry with the date rendered right after its title link.
  for (const m of html.matchAll(/\/blog\/([a-z0-9-]+)/g)) {
    const slug = m[1];
    if (!map[slug] || map[slug].date) continue;
    const seg = html.slice(m.index, m.index + 1200);
    const d = seg.match(MONTHS);
    if (d) map[slug].date = d[0];
  }
  return map;
}

const monthToNum = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

function toIso(dateStr) {
  const m = dateStr.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return "";
  const [, mon, day, yr] = m;
  return `${yr}-${String(monthToNum[mon]).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const map = {};
for (const path of ["/all-news", "/2"]) {
  const html = await fetchText(`${BASE}${path}`);
  Object.assign(map, parseListing(html));
  await sleep(2500);
}
console.log("Listing map has", Object.keys(map).length, "articles");

const articles = await client.fetch(
  '*[_type=="article"]{_id, "slug": slug.current, title, publishedAt}'
);
let updated = 0;
for (const a of articles) {
  const meta = map[a.slug] || {};
  const patch = {};
  if (meta.title && meta.title !== a.title) patch.title = meta.title;
  if (meta.date) {
    const iso = toIso(meta.date);
    if (iso && iso !== a.publishedAt) patch.publishedAt = iso;
  }
  if (Object.keys(patch).length) {
    await client.patch(a._id).set(patch).commit();
    updated++;
    console.log("fixed", a.slug, "|", patch.title || "", "|", patch.publishedAt || "");
  }
}
console.log(`\nDone. Updated ${updated} articles.`);
