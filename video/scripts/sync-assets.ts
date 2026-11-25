/**
 * Copies brand assets from the Optimus repo into video/public (the repo stays the single source),
 * then reports which owner recordings and audio stems are present. Copied folders are gitignored.
 *
 *   npm run assets
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { AUDIO, RECORDINGS, STILLS } from "../src/config";

// npm scripts run from the package folder (video/)
const videoRoot = process.cwd();
const repoRoot = path.resolve(videoRoot, "..");
const pub = path.join(videoRoot, "public");

const copyFile = (from: string, to: string): void => {
  const src = path.join(repoRoot, from);
  if (!existsSync(src)) throw new Error(`missing source: ${from}`);
  mkdirSync(path.dirname(path.join(pub, to)), { recursive: true });
  copyFileSync(src, path.join(pub, to));
};

// Fonts and their OFL licences (src/report/assets/fonts)
const fontDir = path.join("src", "report", "assets", "fonts");
for (const f of readdirSync(path.join(repoRoot, fontDir))) copyFile(path.join(fontDir, f), path.join("fonts", f));

// Pixel art (website/public/art), copied whole: plates, editorial, agents and sheets, hero and dusk layers
cpSync(path.join(repoRoot, "website", "public", "art"), path.join(pub, "art"), { recursive: true });
copyFile(path.join("website", "src", "content", "agent-frames.json"), path.join("art", "agent-frames.json"));

// Archived evidence stills for build U (session c61591)
const ev = path.join("tests", "fixtures", "report-bundle", "evidence");
copyFile(path.join(ev, "repair-20261123014521-c61591-run-0", "L4-reload.jpg"), STILLS.uBrokenReload);
copyFile(path.join(ev, "repair-20261123014521-c61591-run-2", "L4-reload.jpg"), STILLS.uFixedReload);

// Live run (session 7efe46): Kane's end-of-step screenshot after the L4 reload, taken straight
// from each run's evidence pack (a zip) with Windows' built-in tar.
const live = [
  { run: "7efe46-run-0-L0n6YR", pack: "14fa7926-4f6a-42f4-94ce-f0e7522b820e", step: "15-2-3", to: STILLS.liveBrokenReload },
  { run: "7efe46-run-1-X0y2ET", pack: "b91b8b14-52cc-4e7a-9f3d-e040d17388c3", step: "14-2-2", to: STILLS.liveFixedReload },
];
const tmp = path.join(videoRoot, "out", "extract");
for (const l of live) {
  const evidence = path.join(repoRoot, ".optimus", "runs", "pack-library", l.run, "scenario-L4", "attempt-1", ".testmuai", "evidence", `${l.pack}.evidence`);
  if (!existsSync(evidence)) throw new Error(`missing evidence pack: ${evidence}`);
  const member = `tests/l4-1ba66126/steps/${l.step}/screenshot.jpg`;
  mkdirSync(tmp, { recursive: true });
  const r = spawnSync("C:\\Windows\\System32\\tar.exe", ["-xf", evidence, "-C", tmp, member], { shell: false, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`tar failed for ${l.run}: ${r.stderr}`);
  mkdirSync(path.dirname(path.join(pub, l.to)), { recursive: true });
  copyFileSync(path.join(tmp, ...member.split("/")), path.join(pub, l.to));
}
rmSync(tmp, { recursive: true, force: true });

mkdirSync(path.join(pub, "recordings"), { recursive: true });
mkdirSync(path.join(pub, "audio"), { recursive: true });

console.log("Assets copied: fonts, art, evidence stills.\n");

const mb = (p: string) => (statSync(p).size / 1e6).toFixed(1);
console.log("Recordings (public/recordings):");
for (const [id, r] of Object.entries(RECORDINGS)) {
  const p = path.join(pub, r.file);
  console.log(`  ${existsSync(p) ? "✓" : "·"} ${id.padEnd(4)} ${r.file.padEnd(36)} ${existsSync(p) ? `${mb(p)} MB` : "missing"}  (${r.what})`);
}
console.log("\nAudio stems (public/audio):");
for (const [id, file] of Object.entries(AUDIO.stems)) {
  const p = path.join(pub, file);
  console.log(`  ${existsSync(p) ? "✓" : "·"} ${id.padEnd(6)} ${file.padEnd(20)} ${existsSync(p) ? `${mb(p)} MB` : "missing"}`);
}
