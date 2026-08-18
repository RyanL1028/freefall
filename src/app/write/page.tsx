"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { htmlToBlocks } from "@sanity/block-tools";
import { Schema } from "@sanity/schema";
import { auth, googleProvider } from "@/lib/firebase";
import { getCategories } from "@/lib/sanity";
import { isEditor } from "@/lib/editors";
import type { Category } from "@/lib/types";

const NOTIFY_URL = process.env.NEXT_PUBLIC_NOTIFY_URL || "";

const blockSchema = Schema.compile({
  types: [{ type: "array", name: "body", of: [{ type: "block" }] }],
});
const bodyType = blockSchema.get("body");

type Status = "idle" | "saving" | "done" | "error";

export default function WritePage() {
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState("");
  const [headline, setHeadline] = useState(false);
  const [trending, setTrending] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (auth) return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    getCategories().then((c) => {
      setCategories(c);
      if (c.length && !categoryId) setCategoryId(c[0]._id);
    });
  }, [categoryId]);

  const exec = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
  }, []);

  const insertLink = () => {
    const url = window.prompt("Link URL (start with https://):");
    if (url) exec("createLink", url);
  };

  async function saveArticle(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setStatus("saving");
    try {
      const html = editorRef.current?.innerHTML || "";
      const parseHtml = (h: string) => new DOMParser().parseFromString(h, "text/html");
      const blocks = htmlToBlocks(html, bodyType, { parseHtml });
      if (!blocks.length) throw new Error("Write some article content first.");

      const token = await user.getIdToken();
      const res = await fetch(`${NOTIFY_URL}/article`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          excerpt,
          author,
          date,
          categoryId,
          headline,
          trending,
          body: blocks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't publish.");
      setSavedUrl(data.url || "");
      setStatus("done");
      setMsg("Article published! It'll appear on the site after the next rebuild.");
    } catch (err: any) {
      setStatus("error");
      setMsg(err?.message || "Something went wrong.");
    }
  }

  // ---- Auth gate ----
  if (!auth) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p>Sign-in isn't configured yet.</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-3xl font-bold">Editor</h1>
        <p className="mt-2 text-slate-500">Sign in with your editor account to write.</p>
        <button
          onClick={() => signInWithPopup(auth!, googleProvider!)}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold shadow-sm transition hover:border-brand"
        >
          <img src="/logos/google.svg" alt="" className="h-5 w-5" />
          Sign in with Google
        </button>
      </div>
    );
  }
  if (!isEditor(user)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-3xl font-bold">Not authorised</h1>
        <p className="mt-2 text-slate-500">
          Only the Free-Fall editor can publish. Signed in as {user.email}.
        </p>
      </div>
    );
  }

  const toolBtn =
    "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand hover:text-brand disabled:opacity-50";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Write an article</h1>
      <p className="mt-1 text-sm text-slate-500">
        Signed in as {user.email} · saves to Free-Fall News
      </p>

      {status === "done" ? (
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-lg font-semibold text-brand">🎉 {msg}</p>
          {savedUrl && (
            <a href={savedUrl} className="mt-2 inline-block text-brand underline">
              View article →
            </a>
          )}
        </div>
      ) : (
        <form onSubmit={saveArticle} className="mt-8 grid gap-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Headline"
            required
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-xl font-bold outline-none focus:border-brand"
          />
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Short excerpt (shown on cards)"
            rows={2}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author (e.g. Writer 008)"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand"
            />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand"
            >
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand"
            />
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={headline} onChange={(e) => setHeadline(e.target.checked)} />
                Headline
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={trending} onChange={(e) => setTrending(e.target.checked)} />
                Trending
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-300">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2">
              <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}>
                <b>B</b>
              </button>
              <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}>
                <i>I</i>
              </button>
              <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "h2")}>
                H2
              </button>
              <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "h3")}>
                H3
              </button>
              <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={insertLink}>
                🔗 Link
              </button>
              <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")}>
                • List
              </button>
              <button type="button" className={toolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "p")}>
                ¶ Para
              </button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[300px] px-4 py-3 text-slate-800 outline-none"
              data-placeholder="Write your article here…"
            />
          </div>

          {status === "error" && <p className="text-sm text-yt">{msg}</p>}

          <button
            disabled={status === "saving"}
            className="mt-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90 disabled:opacity-50"
          >
            {status === "saving" ? "Publishing…" : "Publish article"}
          </button>
        </form>
      )}
    </div>
  );
}
