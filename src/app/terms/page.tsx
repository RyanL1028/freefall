import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  robots: { index: false },
};

export default function TermsPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), "src/content/terms.md"),
    "utf8"
  );
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <article className="prose prose-slate max-w-none prose-headings:mb-3 prose-headings:mt-8 prose-h1:text-3xl prose-h1:font-extrabold prose-h2:text-xl prose-h2:font-bold prose-h2:text-ink prose-p:leading-relaxed prose-a:text-brand prose-th:text-left prose-th:whitespace-nowrap">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>
    </div>
  );
}
