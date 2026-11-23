import { readFileSync } from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/sections";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Optimus docs",
  description: "How to run Optimus: contracts, Kane runs, verdicts and the repair loop.",
};

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

/** The repository README, rendered at build time. Repo-relative links point at files that are not published, so they become plain text. */
function renderReadme() {
  const source = readFileSync(path.join(process.cwd(), "..", "README.md"), "utf8");
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        return `<h${depth} id="${slug(text)}">${text}</h${depth}>\n`;
      },
      link({ href, tokens }) {
        const text = this.parser.parseInline(tokens);
        return /^https?:\/\//.test(href) ? `<a href="${href.replace(/"/g, "&quot;")}">${text}</a>` : `<span>${text}</span>`;
      },
      html() {
        return "";
      },
    },
  });
  return marked.parse(source, { async: false }) as string;
}

export default function DocsPage() {
  const html = renderReadme();
  return (
    <>
      <SiteNav overHero={false} />
      <main id="main" className="mx-auto max-w-[880px] px-4 pt-32 pb-24 md:px-8">
        <p className="label-mono text-ink-muted">Documentation · from the repository README</p>
        <article
          className="docs mt-6"
          // README.md is repository content written by the maintainers; raw HTML in it is dropped above.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
