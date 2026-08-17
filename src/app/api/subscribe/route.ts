import { NextRequest, NextResponse } from "next/server";
import { getOrCreateAudience, upsertContact, sendEmail } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, firstName, lastName, consent } = await req.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json(
        { error: "Please agree to the Terms & Privacy Policy." },
        { status: 400 }
      );
    }
    // If Resend isn't configured yet, still acknowledge success so the
    // sign-up flow doesn't break before setup is complete.
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ ok: true, note: "email service not configured" });
    }

    const audienceId = await getOrCreateAudience();
    if (audienceId) {
      await upsertContact(audienceId, email, firstName, lastName);
    }
    await sendEmail(
      [email],
      "Welcome to Free-Fall News 🗞️",
      `<div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h1 style="color:#0d9488">Welcome to Free-Fall News!</h1>
        <p>Thanks for subscribing${firstName ? ", " + firstName : ""}.</p>
        <p>You'll get the latest school and world news, made by students for students — straight to your inbox.</p>
        <p>— The Free-Fall Team</p>
      </div>`
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
