// Publish the real comparison bundle next to the website so "See a real report" opens a real report.
// Copies tests/fixtures/report-bundle/{bundle.json,evidence/} to website/public/report/, then renders
// index.html there with the Optimus CLI (`optimus report`, src/report/render.ts). The committed
// fixture's own index.html is never copied or modified. Runs before `dev` and `build`.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.join(website, "..");
const source = path.join(root, "tests", "fixtures", "report-bundle");
const target = path.join(website, "public", "report");

if (!existsSync(path.join(source, "bundle.json"))) {
  console.error(`No comparison bundle at ${source}. The site renders only from a real bundle.`);
  process.exit(1);
}
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(path.join(source, "bundle.json"), path.join(target, "bundle.json"));
cpSync(path.join(source, "evidence"), path.join(target, "evidence"), { recursive: true });
execFileSync(process.execPath, ["--import", "tsx", path.join("src", "cli.ts"), "report", "--bundle", target], {
  cwd: root,
  stdio: ["ignore", "ignore", "inherit"],
});
console.log(`report rendered to ${path.relative(website, target)}`);
