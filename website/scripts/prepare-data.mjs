// Publish the real comparison bundle next to the website so "See a real report" links to real files.
// Copies tests/fixtures/report-bundle/{index.html,bundle.json,evidence/} to website/public/report/.
// Runs before `dev` and `build`. The report page is the offline report rendered by the Optimus CLI
// (src/report/render.ts); the website never re-renders or edits it.
import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(website, "..", "tests", "fixtures", "report-bundle");
const target = path.join(website, "public", "report");

if (!existsSync(path.join(source, "bundle.json"))) {
  console.error(`No comparison bundle at ${source}. The site renders only from a real bundle.`);
  process.exit(1);
}
rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log(`report bundle published to ${path.relative(website, target)}`);
