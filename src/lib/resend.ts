const RESEND_KEY = process.env.RESEND_API_KEY || "";
const AUDIENCE_NAME = process.env.RESEND_AUDIENCE_NAME || "Free-Fall Newsletter";

const AUTH = { Authorization: `Bearer ${RESEND_KEY}` };

export async function getOrCreateAudience(): Promise<string | null> {
  if (!RESEND_KEY) return null;
  const listRes = await fetch("https://api.resend.com/audiences", {
    headers: AUTH,
  });
  const list = await listRes.json();
  const items = list?.data || [];
  const existing = items.find((a: any) => a.name === AUDIENCE_NAME);
  if (existing?.id) return existing.id;
  const created = await fetch("https://api.resend.com/audiences", {
    method: "POST",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: JSON.stringify({ name: AUDIENCE_NAME }),
  });
  const c = await created.json();
  return c?.id || c?.data?.id || null;
}

export async function upsertContact(
  audienceId: string,
  email: string,
  firstName?: string,
  lastName?: string
) {
  return fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
    method: "POST",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      first_name: firstName || "",
      last_name: lastName || "",
      unsubscribed: false,
    }),
  });
}

export async function listContactEmails(audienceId: string): Promise<string[]> {
  const res = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts`,
    { headers: AUTH }
  );
  const data = await res.json();
  return (data?.data || []).map((c: any) => c.email);
}

export async function sendEmail(
  to: string[],
  subject: string,
  html: string
) {
  if (!RESEND_KEY || !to.length) return null;
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "Free-Fall News <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
}
