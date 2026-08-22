import Link from "next/link";
import WriteLink from "./WriteLink";

const links = [
  { href: "/", label: "Home" },
  { href: "/categories", label: "News Categories" },
  { href: "/all-news", label: "All News" },
  { href: "/writers", label: "Writers" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Free-Fall News" className="h-8 w-8 rounded-lg" />
          <span>Free-Fall News</span>
        </Link>
        <div className="flex flex-wrap items-center gap-1 text-sm font-medium">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-slate-700 transition hover:bg-brand-bg hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
          <WriteLink />
        </div>
      </nav>
    </header>
  );
}
