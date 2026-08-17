import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  robots: { index: false },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <div className="prose mt-6 space-y-4 text-slate-700">
        <p>
          Free-Fall News is run by students. This page explains what data we
          collect and how we use it.
        </p>
        <h2 className="text-xl font-semibold">Newsletter</h2>
        <p>
          If you subscribe, we collect your name and email address so we can
          send you news updates. We use a mailing service (Resend) to deliver
          those emails. You can unsubscribe at any time.
        </p>
        <h2 className="text-xl font-semibold">Sign-in</h2>
        <p>
          If you sign in with Google, Microsoft or another provider, we store
          your email and display name for your subscription record. We do not
          access anything else in those accounts.
        </p>
        <h2 className="text-xl font-semibold">Notifications &amp; cookies</h2>
        <p>
          Push notifications are delivered by OneSignal. We use minimal
          cookies to keep the site working smoothly.
        </p>
        <h2 className="text-xl font-semibold">Contact</h2>
        <p>
          Questions? Email{" "}
          <a href="mailto:social.freefall@gmail.com" className="text-brand underline">
            social.freefall@gmail.com
          </a>.
        </p>
      </div>
    </div>
  );
}
