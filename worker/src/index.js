// Free-Fall News notification worker (Cloudflare Workers, free tier).
//
//  POST /subscribe  → add a Resend contact + send the welcome email
//  POST /notify     → Sanity webhook: OneSignal push + Resend email on publish
//
// Deploy: npx wrangler deploy   (secrets via `npx wrangler secret put …`)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
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

async function getOrCreateAudience(env) {
  const name = env.RESEND_AUDIENCE_NAME || "Free-Fall Newsletter";
  const list = await resend("GET", "/audiences", env);
  const existing = (list?.data || []).find((a) => a.name === name);
  if (existing?.id) return existing.id;
  const created = await resend("POST", "/audiences", env, { name });
  return created?.id || created?.data?.id;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    let body = {};
    try {
      body = await request.json();
    } catch {}
    if (path === "/subscribe") return subscribe(body, env);
    if (path === "/notify") return notify(request, body, env);
    return json({ error: "Not found" }, 404);
  },
};

async function subscribe(body, env) {
  const { email, firstName, lastName, consent } = body;
  if (!email || !email.includes("@")) {
    return json({ error: "A valid email is required." }, 400);
  }
  if (!consent) {
    return json({ error: "Please agree to the Terms & Privacy Policy." }, 400);
  }
  if (!env.RESEND_API_KEY) return json({ ok: true, note: "email service not configured" });
  try {
    const audienceId = await getOrCreateAudience(env);
    if (audienceId) {
      await resend("POST", `/audiences/${audienceId}/contacts`, env, {
        email,
        first_name: firstName || "",
        last_name: lastName || "",
        unsubscribed: false,
      });
    }
    await resend("POST", "/emails", env, {
      from: env.RESEND_FROM || "Free-Fall News <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Free-Fall News 🗞️",
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto"><h1 style="color:#0d9488">Welcome to Free-Fall News!</h1><p>Thanks for subscribing${firstName ? ", " + firstName : ""}.</p><p>You'll get the latest school and world news, made by students for students — straight to your inbox.</p><p>— The Free-Fall Team</p></div>`,
    });
    return json({ ok: true });
  } catch (e) {
    return json({ error: e?.message || "Something went wrong." }, 500);
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
      const audienceId = await getOrCreateAudience(env);
      if (audienceId) {
        const list = await resend("GET", `/audiences/${audienceId}/contacts`, env);
        const emails = (list?.data || []).map((c) => c.email);
        if (emails.length) {
          await resend("POST", "/emails", env, {
            from: env.RESEND_FROM || "Free-Fall News <onboarding@resend.dev>",
            to: emails,
            subject: title,
            html: `<div style="font-family:sans-serif;max-width:560px;margin:auto"><h1 style="color:#0d9488">${title}</h1><p>${excerpt}</p><p><a href="${articleUrl}" style="display:inline-block;background:#23e1cb;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Read the full article →</a></p><p style="color:#888;font-size:12px">You're receiving this because you subscribed to the Free-Fall Newsletter.</p></div>`,
          });
          results.email = "sent";
        }
      }
    } catch (e) {
      results.emailError = e?.message;
    }
  }
  return json({ ok: true, results });
}
