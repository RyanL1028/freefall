// Free-Fall News notification + publishing worker (Cloudflare Workers, free tier).
//
//  POST /subscribe  → add a Resend contact + email a verification code
//  GET|POST /verify → confirm the subscription with the code
//  POST /article    → editor: verify identity + create/update an article in Sanity
//  POST /notify     → Sanity webhook: OneSignal push + Resend email on publish
//
// Deploy: npx wrangler deploy   (secrets via `npx wrangler secret put …`)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function html(body, status = 200) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Free-Fall News</title></head><body style="font-family:sans-serif;background:#e1fafe;margin:0;display:grid;place-items:center;min-height:100vh"><div style="background:#fff;padding:32px;border-radius:16px;max-width:420px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.08)"><h1 style="color:#0d9488;font-size:22px">${body}</h1></div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", ...CORS } }
  );
}

function secureCompare(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function resend(method, path, env, body) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function makeCode() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, "0");
}

function slugify(title) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "article"
  );
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

    if (path === "/verify") return verify(request, env); // GET (link) or POST (form)

    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    let body = {};
    try {
      body = await request.json();
    } catch {}
    if (path === "/subscribe") return subscribe(body, env, request);
    if (path === "/article") return createArticle(request, body, env);
    if (path === "/notify") return notify(request, body, env);
    return json({ error: "Not found" }, 404);
  },
};

async function subscribe(body, env, request) {
  const { email, firstName, lastName, consent } = body;
  if (!email || !email.includes("@")) {
    return json({ error: "A valid email is required." }, 400);
  }
  if (!consent) {
    return json({ error: "Please agree to the Terms & Privacy Policy." }, 400);
  }
  if (!env.RESEND_API_KEY) return json({ ok: true, note: "email service not configured" });
  try {
    const code = makeCode();
    if (env.VERIFY_KV) {
      await env.VERIFY_KV.put(`code:${email.toLowerCase()}`, code, {
        expirationTtl: 86400, // 24h
      });
      await env.VERIFY_KV.put(`sub:${email.toLowerCase()}`, "1");
    }
    const workerOrigin = new URL(request.url).origin;
    const verifyUrl = `${workerOrigin}/verify?email=${encodeURIComponent(email)}&code=${code}`;

    await resend("POST", "/emails", env, {
      from: env.RESEND_FROM || "Free-Fall News <onboarding@resend.dev>",
      to: [email],
      subject: "Confirm your Free-Fall News subscription",
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto"><h1 style="color:#0d9488">Welcome to Free-Fall News!</h1><p>Thanks for subscribing to our latest newsletter${firstName ? ", " + firstName : ""}.</p><p>To confirm your subscription, enter this code on the site:</p><p style="font-size:28px;letter-spacing:4px;font-weight:bold;color:#0d9488">${code}</p><p>or click to confirm:</p><p><a href="${verifyUrl}" style="display:inline-block;background:#23e1cb;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Confirm my subscription</a></p><p>You'll get the latest school and world news, made by students for students — straight to your inbox!</p><p>— Ryan and the Free-Fall Team</p></div>`,
    });
    return json({ ok: true, needsVerification: true, email });
  } catch (e) {
    return json({ error: e?.message || "Something went wrong." }, 500);
  }
}

async function verify(request, env) {
  const url = new URL(request.url);
  let email = (url.searchParams.get("email") || "").toLowerCase();
  let code = url.searchParams.get("code") || "";
  if (request.method === "POST") {
    try {
      const b = await request.json();
      email = (b.email || email).toLowerCase();
      code = b.code || code;
    } catch {}
  }
  if (!email || !code) return json({ error: "Missing email or code." }, 400);
  if (!env.VERIFY_KV) return json({ error: "Verification not configured." }, 500);

  const stored = await env.VERIFY_KV.get(`code:${email}`);
  if (!stored || !secureCompare(stored, code)) {
    return request.method === "GET"
      ? html("Verification failed — the code is invalid or expired. Please subscribe again.")
      : json({ error: "Invalid or expired code." }, 400);
  }
  await env.VERIFY_KV.put(`verified:${email}`, "1", { expirationTtl: 31536000 });
  await env.VERIFY_KV.delete(`code:${email}`);
  return request.method === "GET"
    ? html("You're verified! Welcome to the Free-Fall News newsletter 🎉")
    : json({ ok: true, verified: true });
}

// --- Editor / article publishing ---

// Verifies the caller is a signed-in Firebase user whose email is in the
// editor allowlist. Uses Firebase's public token endpoint (no admin SDK).
async function verifyEditor(request, env) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !env.FIREBASE_API_KEY) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const email = data?.users?.[0]?.email;
    const uid = data?.users?.[0]?.localId;
    const allowEmails = (env.EDITOR_EMAILS || "social.freefall@gmail.com")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const allowUids = (env.EDITOR_UIDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (email && allowEmails.includes(email.toLowerCase())) return email;
    if (uid && allowUids.includes(uid)) return email || uid;
    return null;
  } catch {
    return null;
  }
}

async function sanityMutate(env, mutations) {
  const url = `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2026-08-17/data/mutate/${env.SANITY_DATASET || "production"}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.SANITY_TOKEN}`,
    },
    body: JSON.stringify({ mutations }),
  });
  return res.json();
}

async function sendNotifications(title, slug, excerpt, env) {
  const siteUrl = env.SITE_URL || "https://freefall-news.web.app";
  const articleUrl = `${siteUrl}/article/${slug}`;
  const results = {};

  if (env.ONESIGNAL_APP_ID && env.ONESIGNAL_API_KEY) {
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        Authorization: `Basic ${env.ONESIGNAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: env.ONESIGNAL_APP_ID,
        included_segments: ["All"],
        headings: { en: title },
        contents: { en: (excerpt || "").slice(0, 120) },
        url: articleUrl,
      }),
    });
    results.push = await res.json();
  }

  if (env.RESEND_API_KEY) {
    try {
      if (env.VERIFY_KV) {
        const listed = await env.VERIFY_KV.list({ prefix: "sub:" });
        const emails = [];
        for (const k of listed.keys) {
          const e = k.name.slice(4);
          if (await env.VERIFY_KV.get(`verified:${e}`)) emails.push(e);
        }
        if (emails.length) {
          await resend("POST", "/emails", env, {
            from: env.RESEND_FROM || "Free-Fall News <onboarding@resend.dev>",
            to: emails,
            subject: title,
            html: `<div style="font-family:sans-serif;max-width:560px;margin:auto"><h1 style="color:#0d9488">${title}</h1><p>${excerpt}</p><p><a href="${articleUrl}" style="display:inline-block;background:#23e1cb;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Read the full article →</a></p><p style="color:#888;font-size:12px">You're receiving this because you subscribed to the Free-Fall Newsletter.</p></div>`,
          });
          results.email = "sent";
        } else {
          results.email = "no verified subscribers";
        }
      }
    } catch (e) {
      results.emailError = e?.message;
    }
  }
  return results;
}

async function createArticle(request, body, env) {
  const editorEmail = await verifyEditor(request, env);
  if (!editorEmail) return json({ error: "You're not authorised to publish." }, 403);

  const { title, excerpt, author, date, categoryId, headline, trending, body: blocks } = body;
  if (!title || !title.trim()) return json({ error: "A title is required." }, 400);
  if (!Array.isArray(blocks) || !blocks.length) return json({ error: "The article body is empty." }, 400);
  if (!env.SANITY_TOKEN) return json({ error: "Publishing isn't configured yet." }, 500);

  const slug = slugify(title);
  const today = new Date().toISOString().slice(0, 10);
  const doc = {
    _type: "article",
    title: title.trim(),
    slug: { _type: "slug", current: slug },
    publishedAt: date || today,
    excerpt: excerpt || "",
    author: author || "Free-Fall News",
    category: categoryId ? { _type: "reference", _ref: categoryId } : undefined,
    headline: !!headline,
    trending: !!trending,
    body: blocks,
  };

  try {
    await sanityMutate(env, [{ createOrReplace: { ...doc, _id: `editor-${slug}` } }]);
    const notifyResults = await sendNotifications(doc.title, slug, doc.excerpt, env);
    return json({ ok: true, slug, url: `${env.SITE_URL || "https://freefall-news.web.app"}/article/${slug}`, notify: notifyResults });
  } catch (e) {
    return json({ error: e?.message || "Failed to publish." }, 500);
  }
}

async function notify(request, body, env) {
  const secret = env.NOTIFY_SECRET || "";
  const auth = request.headers.get("authorization") || "";
  if (secret && !secureCompare(auth, `Bearer ${secret}`)) {
    return json({ error: "Unauthorized" }, 401);
  }
  const title = body?.title || body?.data?.title || "New article on Free-Fall News";
  const slug = body?.slug || body?.data?.slug?.current || "";
  const excerpt = body?.excerpt || body?.data?.excerpt || title;
  const results = await sendNotifications(title, slug, excerpt, env);
  return json({ ok: true, results });
}
