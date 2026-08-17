import type { Metadata } from "next";
import { getWriters } from "@/lib/sanity";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Our Team",
  description:
    "Meet the Free-Fall News team — the hardworking writers and reporters who bring you the latest news.",
};

export default async function WritersPage() {
  const writers = await getWriters();
  const active = writers.filter((w) => !w.role.toLowerCase().includes("former"));
  const former = writers.filter((w) => w.role.toLowerCase().includes("former"));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Our Team (Free-Fall Social)</h1>
      <p className="mt-1 text-slate-500">of hardworking writers and reporters</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((w) => (
          <div key={w._id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              {w.photo?.asset?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.photo.asset.url} alt={w.name} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-full bg-brand text-lg font-bold text-white">
                  {w.name.slice(0, 1)}
                </span>
              )}
              <div>
                <h2 className="font-bold">{w.name}</h2>
                <p className="text-xs text-brand">{w.role}</p>
              </div>
            </div>
            {w.bio && <p className="mt-3 text-sm leading-relaxed text-slate-600">{w.bio}</p>}
          </div>
        ))}
      </div>

      {former.length > 0 && (
        <>
          <h2 className="mt-12 text-2xl font-bold">Former Writers</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {former.map((w) => (
              <div key={w._id} className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                <h3 className="font-bold">{w.name}</h3>
                <p className="text-xs text-slate-500">{w.role}</p>
                {w.bio && <p className="mt-2 text-sm text-slate-600">{w.bio}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
