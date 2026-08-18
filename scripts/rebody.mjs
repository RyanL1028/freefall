// Re-imports the FULL body text of every article from the old site.
// The first migration ran through a proxy that truncated the pages; direct
// fetches (browser UA) return the complete article. Only `body` is updated,
// so the cleaned titles/dates are preserved.
//
// Usage: node --env-file=.env.local scripts/rebody.mjs
import { createClient } from "@sanity/client";
import { htmlToBlocks } from "@sanity/block-tools";
import Schema from "@sanity/schema";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2026-08-17",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const BASE = "https://freefall.mystrikingly.com";

const blockSchema = Schema.compile({
  types: [{ type: "array", name: "body", of: [{ type: "block" }] }],
});
const blockContent = blockSchema.get("body");
const parseHtml = (html) => new JSDOM(html).window.document;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Direct fetch with backoff retries (the old site throttles bursts with a 202
// empty body — slow pacing + retries keep us under it).
async function fetchText(url) {
  const backoff = [8000, 16000, 32000];
  for (let attempt = 0; attempt <= backoff.length; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      });
      const text = await res.text();
      if (res.ok && text && text.length > 5000) return text;
      console.log(`  throttled (${res.status}, ${(text || "").length}b) — waiting…`);
    } catch {}
    if (attempt < backoff.length) await sleep(backoff[attempt]);
  }
  throw new Error("still throttled: " + url);
}

const articles = await client.fetch('*[_type=="article"]{_id, "slug": slug.current}');
console.log("Re-bodying", articles.length, "articles");

let ok = 0, empty = 0, fail = 0;
for (const a of articles) {
  try {
    const html = await fetchText(`${BASE}/blog/${a.slug}`);
    const $ = cheerio.load(html);
    const container = $(".s-blog-post-section").first();
    const ch = container.html() || "";
    let blocks = [];
    try {
      blocks = htmlToBlocks(ch, blockContent, { parseHtml });
    } catch (e) {
      console.log("  block conversion failed:", e.message.slice(0, 90));
    }
    blocks = (blocks || []).filter((b) => {
      const t = (b.children || []).map((c) => c.text || "").join(" ").trim();
      if (!t) return false;
      if (t.includes("Written by")) return false;
      if (/^Read more/i.test(t)) return false;
      return true;
    });
    // Drop the leading title/subtitle heading, keep in-body headings.
    while (blocks.length && ["h1", "h2", "h3"].includes(blocks[0].style)) blocks.shift();

    if (blocks.length) {
      await client.patch(a._id).set({ body: blocks }).commit();
      const chars = blocks
        .map((b) => (b.children || []).map((c) => c.text || "").join(""))
        .join(" ").length;
      ok++;
      console.log("OK", a.slug, "|", blocks.length, "blocks |", chars, "chars");
    } else {
      empty++;
      console.log("EMPTY", a.slug);
    }
  } catch (e) {
    fail++;
    console.log("FAIL", a.slug, e.message.slice(0, 80));
  }
  await sleep(2000);
}
console.log(`\nDone. ${ok} updated, ${empty} empty, ${fail} failed.`);
