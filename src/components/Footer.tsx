import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 text-center text-sm text-slate-600">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/" className="hover:text-ink">Home</Link>
          <Link href="/all-news" className="hover:text-ink">Posts</Link>
          <a href="https://whatsapp.com/channel/0029VbBFDWU6buMCHWke081T" target="_blank" rel="noopener noreferrer" className="hover:text-ink">
            Find Us (WhatsApp)
          </a>
          <a href="mailto:social.freefall@gmail.com" className="hover:text-ink">
            Contact
          </a>
          <Link href="/terms" className="hover:text-ink">Terms &amp; Conditions</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy Policy</Link>
        </div>
        <p>Proudly Presented by the Free-Fall Social and Executive Team</p>
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} Free-Fall News. Made by students, for students.
        </p>
      </div>
    </footer>
  );
}
