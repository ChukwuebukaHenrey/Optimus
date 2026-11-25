/**
 * QA contact sheet (master prompt Phase 6): renders stills at the start, middle, peak and end of
 * every scene with one bundle and one browser, then tiles them with frame numbers into
 * out/qa/contact-sheet-<n>.png.
 *
 *   npm run qa            (all scenes)
 *   npm run qa -- 4b 4c   (only those scenes)
 */
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { TIMELINE, TOOLING, VIDEO } from "../src/config";

const args = process.argv.slice(2);
/** `f:<frame>` adds an exact frame (e.g. f:8460); other args pick scenes. */
const exact = args.filter((a) => a.startsWith("f:")).map((a) => Number(a.slice(2)));
const only = args.filter((a) => !a.startsWith("f:"));
const out = path.join(process.cwd(), "out", "qa");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// Four checkpoints per scene: just after entrance, middle, two-thirds (usually the peak), end.
const frames: Array<{ scene: string; frame: number }> = [];
for (const sc of TIMELINE) {
  if (exact.length && !only.length) continue;
  if (only.length && !only.includes(sc.id)) continue;
  for (const f of [0.08, 0.5, 0.72, 0.97]) frames.push({ scene: sc.id, frame: sc.from + Math.round(sc.frames * f) });
}

for (const f of exact) frames.push({ scene: TIMELINE.filter((s) => s.from <= f).pop()?.id ?? "?", frame: f });
frames.sort((a, b) => a.frame - b.frame);

const main = async () => {
  const serveUrl = await bundle({ entryPoint: path.join(process.cwd(), "src", "index.ts") });
  const browser = await openBrowser("chrome");
  const composition = await selectComposition({ serveUrl, id: VIDEO.id, puppeteerInstance: browser });
  const files: string[] = [];
  for (const { scene, frame } of frames) {
    const file = path.join(out, `${String(frame).padStart(5, "0")}-s${scene}.png`);
    await renderStill({ serveUrl, composition, frame, output: file, puppeteerInstance: browser, scale: 0.5 });
    files.push(file);
    process.stdout.write(`s${scene}@${frame} `);
  }
  await browser.close({ silent: true });

  // Tile 4 per row (one scene per row), 4 rows per sheet, with frame numbers burned in.
  const ffmpeg = path.join(process.env.OPTIMUS_FFMPEG_DIR ?? TOOLING.ffmpegDir, "ffmpeg.exe");
  for (let i = 0; i < files.length; i += 16) {
    const chunk = files.slice(i, i + 16);
    const args = chunk.flatMap((f) => ["-i", f]);
    const layout = chunk.map((_, k) => `${(k % 4) * 960}_${Math.floor(k / 4) * 540}`).join("|");
    const sheet = path.join(out, `contact-sheet-${i / 16 + 1}.png`);
    const filter = chunk.length > 1 ? ["-filter_complex", `xstack=inputs=${chunk.length}:layout=${layout}:fill=black`] : [];
    const r = spawnSync(ffmpeg, ["-v", "error", "-y", ...args, ...filter, sheet], { shell: false, encoding: "utf8" });
    if (r.status !== 0) throw new Error(r.stderr);
    console.log(`\n${sheet}`);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
