// One-time migration: imports ~50 articles + categories + writers from
// freefall.mystrikingly.com into the Sanity project.
// Usage: node --env-file=.env.local scripts/migrate.mjs
import { createClient } from "@sanity/client";
import { htmlToBlocks } from "@sanity/block-tools";
import Schema from "@sanity/schema";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_TOKEN;
if (!projectId || !token) {
  console.error("Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_TOKEN first.");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2026-08-17",
  token,
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

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

async function ensureDataset() {
  // The "production" dataset already exists (created when the Sanity project
  // was set up). If it somehow doesn't, create it in the Sanity dashboard:
  // sanity.io > project > Datasets > Add dataset.
  console.log("Using dataset:", dataset);
}

const CATEGORIES = [
  { title: "School News", slug: "school", description: "Events, Updates and more!" },
  { title: "The World News", slug: "world", description: "Discover compelling stories that explore the World and things going on around the Earth" },
  { title: "Hong Kong News", slug: "hong-kong", description: "Culture, Events and more!" },
  { title: "Educational", slug: "educational", description: "Learn new things - be smart!" },
  { title: "Sports News", slug: "sports", description: "Thoughts, musings, and ruminations" },
  { title: "Artificial Intelligence", slug: "ai", description: "In collaboration with the NAISHK AI Committee!" },
  { title: "Business News", slug: "business", description: "Explore insightful analysis and updates on the evolving business perspectives and landscape." },
  { title: "Disasters", slug: "disasters", description: "Will be remembered forever..." },
];

async function ensureCategories() {
  const ids = {};
  for (const c of CATEGORIES) {
    const existing = await client.fetch(
      `*[_type=="category" && slug.current==$s][0]._id`,
      { s: c.slug }
    );
    if (existing) {
      ids[c.slug] = existing;
    } else {
      const doc = await client.create({
        _type: "category",
        title: c.title,
        slug: { _type: "slug", current: c.slug },
        description: c.description,
      });
      ids[c.slug] = doc._id;
      console.log("category:", c.title);
    }
  }
  return ids;
}

// The News Categories page groups each article under a category heading.
// Slice the raw HTML between consecutive heading titles to map slug -> category.
async function buildSlugToCategory() {
  const html = await fetchText(`${BASE}/2`);
  const markers = [
    ["School News", "school"],
    ["The World News", "world"],
    ["Hong Kong News", "hong-kong"],
    ["Educational", "educational"],
    ["Sports News", "sports"],
    ["Artificial Intellegence", "ai"],
    ["Artificial Intelligence", "ai"],
    ["Business News", "business"],
    ["Disasters", "disasters"],
  ];
  const positions = [];
  for (const [label, slug] of markers) {
    const i = html.indexOf(label);
    if (i >= 0) positions.push({ i, slug });
  }
  positions.sort((a, b) => a.i - b.i);
  const map = {};
  for (let k = 0; k < positions.length; k++) {
    const end = k + 1 < positions.length ? positions[k + 1].i : html.length;
    const seg = html.slice(positions[k].i, end);
    for (const m of seg.matchAll(/blog\/([a-z0-9-]+)/g)) map[m[1]] = positions[k].slug;
  }
  return map;
}

async function collectSlugs() {
  const slugs = new Set();
  for (const path of ["/all-news", "/2"]) {
    const html = await fetchText(`${BASE}${path}`);
    for (const m of html.matchAll(/blog\/([a-z0-9-]+)/g)) slugs.add(m[1]);
  }
  return [...slugs];
}

async function parseArticle(slug) {
  const html = await fetchText(`${BASE}/blog/${slug}`);
  const $ = cheerio.load(html);
  const container = $(".s-blog-post-section").first();
  const title = container.find("h1").first().text().trim() || $("title").text().trim();
  const full = container.text();
  const date =
    (full.match(
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/
    ) || [])[0] || "";
  const author = (full.match(/Written by\s+([^,|]+)/) || [])[1]?.trim() || "";

  let excerpt = "";
  const firstH2 = container.find("h2").first().text().trim();
  if (firstH2 && firstH2.length < 300 && !/Written by/.test(firstH2)) {
    excerpt = firstH2;
  } else {
    const p = container
      .find("p")
      .filter((_i, el) => {
        const t = $(el).text().trim();
        return t.length > 60 && !t.includes("Written by");
      })
      .first()
      .text()
      .trim();
    excerpt = p ? p.slice(0, 160) + (p.length > 160 ? "…" : "") : "";
  }

  const coverUrl = $('meta[property="og:image"]').attr("content") || "";

  let blocks = [];
  try {
    blocks = htmlToBlocks(container.html(), blockContent, { parseHtml });
  } catch (e) {
    console.log("  block conversion failed:", e.message);
  }
  blocks = (blocks || []).filter((b) => {
    const t = (b.children || []).map((c) => c.text || "").join(" ").trim();
    if (!t) return false;
    if (t.includes("Written by")) return false;
    if (/^Read more/i.test(t)) return false;
    if (t === title) return false;
    return true;
  });
  while (blocks.length && ["h1", "h2", "h3"].includes(blocks[0].style)) blocks.shift();

  return { title, date, author, excerpt, blocks, coverUrl };
}

async function uploadCover(coverUrl, slug) {
  if (!coverUrl) return undefined;
  const url = coverUrl.startsWith("//") ? "https:" + coverUrl : coverUrl;
  if (!/^https?:/.test(url)) return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = (url.split("?")[0].split(".").pop() || "png").slice(0, 4);
    const asset = await client.assets.upload("image", buf, { filename: `${slug}.${ext}` });
    return { _type: "image", asset: { _type: "reference", _ref: asset._id } };
  } catch {
    return undefined;
  }
}

const WRITERS = [
  { name: "Writer 008 (Formerly 128)", role: "Chief Operating Officer & Former Head of the Free-Fall Social Team", bio: "Chief Operating Officer of Free-Fall News and Former Head of the Free-Fall Social Team. Joined when the organisation was still growing. Writer with experience. Goal is for people to be more aware of world events. With a commitment to journalistic integrity, he strives to foster informed discussions and empower audiences through authentic storytelling and news reporting.", order: 1 },
  { name: "Writer 114", role: "Head of the Free-Fall Social Department", bio: "OUR NEW HEAD OF Free-Fall Social Department! Went to socials from reporting, back to reporting, and went to socials again! Most experienced in the social team. With a keen eye for trends and a passion for engagement, they are set to elevate our social media presence to new heights.", order: 2 },
  { name: "Writer 107", role: "IGCSE Writer", bio: "An IGCSE Writer - writes articles that are brilliant. Her wise perspective is insanely useful! With an engaging writing style, she captivates readers and encourages critical thinking.", order: 3 },
  { name: "Writer 112", role: "Writer", bio: "Newly joined Taiwanese writer! Has written consistently, bringing fresh insights to our team. With a diverse background, she enriches our narratives and broadens our understanding of global perspectives.", order: 4 },
  { name: "Writer 153", role: "Head of Sports", bio: "Our Head of Sports! He is German so he may make some small mistakes in article writing! Despite this, his passion for sports shines through in every piece, engaging readers with insightful analyses and lively commentary.", order: 5 },
  { name: "Founder 016", role: "Founder", bio: "The random founder of Free-Fall News. With a vision to inspire. Their dedication to innovation drives our mission forward.", order: 6 },
  { name: "Writer 113", role: "Former Head of Free-Fall Social", bio: "Former Head of Free-Fall Social. Resigned in April 2026.", order: 7 },
];

async function seedWriters() {
  for (const w of WRITERS) {
    const existing = await client.fetch(`*[_type=="writer" && name==$n][0]._id`, { n: w.name });
    if (!existing) {
      await client.create({ _type: "writer", ...w });
      console.log("writer:", w.name);
    }
  }
}

// The migration needs a token with write access. Sanity tokens created with
// role "Viewer" are read-only and will fail here with a 403.
async function checkWriteAccess() {
  try {
    const tmp = await client.create({ _type: "category", title: "__probe__" });
    await client.delete(tmp._id);
  } catch (e) {
    console.error("SANITY WRITE ACCESS FAILED: " + (e.message || e).slice(0, 200));
    console.error(
      "Create a WRITE token: sanity.io → Project → API → API tokens → Add token, role: Editor.\n" +
      "Then set SANITY_TOKEN to it and run again."
    );
    process.exit(1);
  }
}

await ensureDataset();
await checkWriteAccess();
const catIds = await ensureCategories();
const slugToCat = await buildSlugToCategory();
const slugs = await collectSlugs();
console.log("Found", slugs.length, "article slugs");
await seedWriters();

let ok = 0, fail = 0;
for (const slug of slugs) {
  try {
    const { title, date, author, excerpt, blocks, coverUrl } = await parseArticle(slug);
    if (!title) {
      console.log("SKIP (no title)", slug);
      continue;
    }
    const cover = await uploadCover(coverUrl, slug);
    const catSlug = slugToCat[slug] || "world";
    const doc = {
      title,
      author,
      excerpt,
      publishedAt: date || "",
      slug: { _type: "slug", current: slug },
      category: catIds[catSlug]
        ? { _type: "reference", _ref: catIds[catSlug] }
        : undefined,
      body: blocks,
      coverImage: cover,
    };
    const existing = await client.fetch(
      `*[_type=="article" && slug.current==$s][0]._id`,
      { s: slug }
    );
    if (existing) {
      await client.patch(existing).set(doc).commit();
    } else {
      await client.create({ _type: "article", ...doc });
    }
    ok++;
    console.log("OK", slug, "|", title.slice(0, 42), "|", date || "no date");
  } catch (e) {
    fail++;
    console.log("FAIL", slug, e.message);
  }
}
console.log(`\nDone. ${ok} imported, ${fail} failed.`);
