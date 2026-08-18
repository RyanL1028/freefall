// Re-imports the FULL article text from the old site using Jina's markdown
// mode (the earlier HTML-mode fetch truncated the pages). Only `body` is
// updated, so the cleaned titles/dates are preserved.
//
// Usage: node --env-file=.env.local scripts/rebody-md.mjs
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2026-08-17",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

const BASE = "https://freefall.mystrikingly.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchMarkdown(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "x-no-cache": "true" },
    });
    if (res.status === 429) {
      await sleep(10000);
      continue;
    }
    return await res.text();
  }
  throw new Error("jina rate-limited");
}

// --- Minimal markdown → portable text converter ---
function parseInline(text) {
  const children = [];
  const markDefs = [];
  let n = 0;
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]*\))/g;
  let last = 0;
  let m;
  const push = (t, marks) => children.push({ _type: "span", text: t, marks: marks || [] });
  while ((m = re.exec(text))) {
    if (m.index > last) push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) push(tok.slice(2, -2), ["strong"]);
    else if (tok.startsWith("*")) push(tok.slice(1, -1), ["em"]);
    else {
      const link = tok.match(/\[([^\]]+)\]\(([^)]*)\)/);
      if (link) {
        const key = `l${n++}`;
        push(link[1], [key]);
        markDefs.push({ _key: key, _type: "link", href: link[2] });
      } else push(tok);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) push(text.slice(last));
  return { children, markDefs };
}

function makeBlock(text, style, extra = {}) {
  const { children, markDefs } = parseInline(text);
  return { _type: "block", style, children, markDefs, ...extra };
}

function mdToBlocks(md) {
  const blocks = [];
  let buf = [];
  const flush = () => {
    if (!buf.length) return;
    const text = buf.join(" ").replace(/\s+/g, " ").trim();
    buf = [];
    if (text) blocks.push(makeBlock(text, "normal"));
  };
  for (const raw of md.split("\n")) {
    const t = raw.trim();
    if (!t) {
      flush();
      continue;
    }
    if (/^#{1,4} /.test(t)) {
      flush();
      const level = t.match(/^#+/)[0].length;
      const style = level === 1 ? "h2" : level === 2 ? "h3" : level >= 3 ? "h4" : "normal";
      blocks.push(makeBlock(t.replace(/^#+\s*/, ""), style));
    } else if (/^[-*] /.test(t)) {
      flush();
      blocks.push(makeBlock(t.replace(/^[-*]\s*/, ""), "normal", { listItem: "bullet", level: 1 }));
    } else if (/^\d+\. /.test(t)) {
      flush();
      blocks.push(makeBlock(t.replace(/^\d+\.\s*/, ""), "normal", { listItem: "number", level: 1 }));
    } else {
      buf.push(t);
    }
  }
  flush();
  return blocks;
}

const NOISE =
  /^Home$|News Categories|^All News$|^Writers$|^Login$|Proudly Presented|We use cookies|^Accept$|^Learn More$|^Terms|^Privacy|^Contact$/;

const articles = await client.fetch('*[_type=="article"]{_id, "slug": slug.current, title}');
console.log("Re-bodying", articles.length, "articles via Jina markdown");

let ok = 0, empty = 0, fail = 0;
for (const a of articles) {
  try {
    const md = await fetchMarkdown(`${BASE}/blog/${a.slug}`);
    // Strip the Jina header block (Title / URL Source / Published Time / Date).
    const body = md
      .split("\n")
      .filter((l) => !/^(Title|URL Source|Published Time|Date|Updated Time):/.test(l))
      .join("\n")
      .trim();
    let blocks = mdToBlocks(body).filter((b) => {
      const t = (b.children || []).map((c) => c.text || "").join(" ").trim();
      if (!t) return false;
      if (NOISE.test(t)) return false;
      if (t.includes("Written by")) return false;
      if (a.title && t === a.title) return false;
      return true;
    });
    // Drop a leading heading that is just the article title.
    while (
      blocks.length &&
      ["h2", "h3"].includes(blocks[0].style) &&
      (blocks[0].children || []).map((c) => c.text || "").join(" ") === a.title
    ) {
      blocks.shift();
    }

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
  await sleep(1500);
}
console.log(`\nDone. ${ok} updated, ${empty} empty, ${fail} failed.`);
