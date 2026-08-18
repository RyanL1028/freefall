"use client";

import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import {
  auth,
  db,
  googleProvider,
  microsoftProvider,
  smartnexusProvider,
} from "@/lib/firebase";

type Status = "idle" | "loading" | "done" | "error";

const oauthProviders = [
  { key: "google", label: "Sign up with Google", icon: "G", provider: googleProvider },
  { key: "microsoft", label: "Sign up with Microsoft", icon: "M", provider: microsoftProvider },
  { key: "smartnexus", label: "Sign up with SmartNexus", icon: "S", provider: smartnexusProvider },
];

// The welcome email + contact list are handled by the free Cloudflare Worker
// (see worker/). If it isn't configured yet, the email step is skipped — the
// subscriber record in Firestore is still saved.
const NOTIFY_URL = process.env.NEXT_PUBLIC_NOTIFY_URL || "";

async function subscribeEmail(payload: {
  email: string;
  firstName: string;
  lastName: string;
  consent: boolean;
}) {
  if (!NOTIFY_URL) return;
  const r = await fetch(`${NOTIFY_URL}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("Couldn't add you to the email list.");
}

export default function NewsletterSignup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");

  async function saveRecord(userId: string, name: string, provider: string) {
    if (!db || !userId) return;
    try {
      await setDoc(doc(db, "subscribers", userId), {
        email,
        name,
        provider,
        consent,
        subscribedAt: new Date().toISOString(),
      });
    } catch {
      /* Firestore optional — email list still works via Resend */
    }
  }

  async function subscribeViaOAuth(key: string) {
    const p = oauthProviders.find((x) => x.key === key);
    if (!p?.provider || !auth) {
      setStatus("error");
      setMsg("Sign-in isn't configured yet. Please use the email form below.");
      return;
    }
    setStatus("loading");
    try {
      const user = (await signInWithPopup(auth, p.provider)).user;
      if (!user.email) throw new Error("That provider didn't return an email.");
      const full = user.displayName || "";
      const fName = full.split(" ")[0] || "";
      const lName = full.split(" ").slice(1).join(" ") || "";
      await saveRecord(user.uid, full, key);
      await subscribeEmail({
        email: user.email,
        firstName: fName,
        lastName: lName,
        consent,
      });
      setStatus("done");
      setMsg("You're on the list! Check your inbox for a welcome email.");
    } catch (e: any) {
      setStatus("error");
      setMsg(e?.message || "Something went wrong. Please try again.");
    }
  }

  async function subscribeManual(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setStatus("error");
      setMsg("Please agree to the Terms & Conditions and Privacy Policy first.");
      return;
    }
    if (!email.includes("@")) {
      setStatus("error");
      setMsg("Please enter a valid email address.");
      return;
    }
    setStatus("loading");
    try {
      await subscribeEmail({ email, firstName, lastName, consent });
      setStatus("done");
      setMsg("You're on the list! Check your inbox for a welcome email.");
    } catch (e: any) {
      setStatus("error");
      setMsg(e?.message || "Something went wrong. Please try again.");
    }
  }

  return (
    <section id="newsletter" className="bg-brand-bg">
      <div className="mx-auto max-w-2xl px-4 py-14 text-center">
        <h2 className="text-3xl font-bold">Subscribe to Free-Fall Newsletter</h2>
        <p className="mt-2 text-slate-600">
          Join our mailing list to receive the latest news, insights, and
          exclusive content from Free-Fall.
        </p>

        {status === "done" ? (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-lg font-semibold text-brand">🎉 {msg}</p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-3">
              {oauthProviders.map((p) => (
                <button
                  key={p.key}
                  disabled={status === "loading"}
                  onClick={() => subscribeViaOAuth(p.key)}
                  className="flex items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold shadow-sm transition hover:border-brand disabled:opacity-50"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-xs text-white">
                    {p.icon}
                  </span>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="my-6 flex items-center gap-4 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-300" />
              or with email
              <span className="h-px flex-1 bg-slate-300" />
            </div>
            <form
              onSubmit={subscribeManual}
              className="grid gap-3 text-left sm:grid-cols-2"
            >
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
              />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand sm:col-span-2"
              />
              <label className="flex items-start gap-2 text-xs text-slate-600 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  By continuing, you agree to our{" "}
                  <a href="/terms" className="underline">Terms &amp; Conditions</a> and{" "}
                  <a href="/privacy" className="underline">Privacy Policy</a>.
                </span>
              </label>
              <button
                disabled={status === "loading"}
                className="mt-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90 disabled:opacity-50 sm:col-span-2"
              >
                {status === "loading" ? "Subscribing…" : "Subscribe to our newsletter!"}
              </button>
            </form>
            {status === "error" && (
              <p className="mt-4 text-sm text-yt">{msg}</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
