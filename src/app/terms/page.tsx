import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  robots: { index: false },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Terms &amp; Conditions</h1>
      <div className="prose mt-6 space-y-4 text-slate-700">
        <p>
          Welcome to Free-Fall News, a student-run news publication. By using
          this website you agree to these terms.
        </p>
        <h2 className="text-xl font-semibold">Content</h2>
        <p>
          All articles are written by students and reflect their own reporting
          and research. We aim for accuracy but cannot guarantee that every
          piece is error-free. Please email us if you spot a mistake.
        </p>
        <h2 className="text-xl font-semibold">Newsletter</h2>
        <p>
          When you subscribe, we store your name and email to send you news
          updates. You can unsubscribe at any time using the link in any email
          or by emailing{" "}
          <a href="mailto:social.freefall@gmail.com" className="text-brand underline">
            social.freefall@gmail.com
          </a>.
        </p>
        <h2 className="text-xl font-semibold">Contact</h2>
        <p>
          Any enquiries, please email{" "}
          <a href="mailto:social.freefall@gmail.com" className="text-brand underline">
            social.freefall@gmail.com
          </a>.
        </p>
      </div>
    </div>
  );
}
