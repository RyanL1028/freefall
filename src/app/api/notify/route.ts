import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateAudience,
  listContactEmails,
  sendEmail,
} from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://freefall-news.web.app";

function secureCompare(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest) {
  const secret = process.env.NOTIFY_SECRET || "";
  const auth = req.headers.get("authorization") || "";
  if (secret && !secureCompare(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = body?.title || body?.data?.title || "New article on Free-Fall News";
  const slug = body?.slug || body?.data?.slug?.current || "";
  const excerpt = body?.excerpt || body?.data?.excerpt || title;
  const url = `${siteUrl}/article/${slug}`;

  const results: Record<string, any> = {};

  // 1) Push notification to all web subscribers (OneSignal)
  const onesignalApp = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "";
  const onesignalKey = process.env.ONESIGNAL_API_KEY || "";
  if (onesignalApp && onesignalKey) {
    const r = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        Authorization: `Basic ${onesignalKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: onesignalApp,
        included_segments: ["All"],
        headings: { en: title },
        contents: { en: excerpt.slice(0, 120) },
        url,
      }),
    });
    results.push = await r.json();
  }

  // 2) Email the newsletter list (Resend)
  if (process.env.RESEND_API_KEY) {
    try {
      const audienceId = await getOrCreateAudience();
      if (audienceId) {
        const emails = await listContactEmails(audienceId);
        if (emails.length) {
          const r = await sendEmail(
            emails,
            title,
            `<div style="font-family:sans-serif;max-width:560px;margin:auto">
              <h1 style="color:#0d9488">${title}</h1>
              <p>${excerpt}</p>
              <p><a href="${url}" style="display:inline-block;background:#23e1cb;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Read the full article →</a></p>
              <p style="color:#888;font-size:12px">You're receiving this because you subscribed to the Free-Fall Newsletter.</p>
            </div>`
          );
          results.email = r ? r.status : "skipped";
        }
      }
    } catch (e: any) {
      results.emailError = e?.message;
    }
  }

  return NextResponse.json({ ok: true, results });
}
