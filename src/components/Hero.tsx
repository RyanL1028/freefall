import PushSubscribeButton from "./PushSubscribeButton";

const buttons = [
  {
    label: "WhatsApp Channel",
    href: "https://whatsapp.com/channel/0029VbBFDWU6buMCHWke081T",
    className: "bg-whatsapp hover:bg-whatsapp/90",
    external: true,
  },
  {
    label: "YouTube Channel",
    href: "https://www.youtube.com/@FreeFallNews",
    className: "bg-yt hover:bg-yt/90",
    external: true,
  },
  {
    label: "Articles",
    href: "#news",
    className: "bg-brand-light text-ink hover:bg-brand-light/80",
    external: false,
  },
];

export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-brand-bg via-white to-brand/25">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center sm:py-20">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
          Free-Fall <span className="text-brand">News</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-700">
          Your source for the latest news in school and world news, made by
          students for students.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {buttons.map((b) =>
            b.external ? (
              <a
                key={b.label}
                href={b.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition ${b.className}`}
              >
                {b.label}
              </a>
            ) : (
              <a
                key={b.label}
                href={b.href}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition ${b.className}`}
              >
                {b.label}
              </a>
            )
          )}
        </div>
        <div className="mt-6">
          <PushSubscribeButton />
        </div>
      </div>
    </section>
  );
}
