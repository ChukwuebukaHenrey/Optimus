/**
 * Pre-renders the speed-ups (time-lapses) and freeze frames listed in src/config.ts (DERIVED,
 * FREEZES) from the owner's recordings, with the system FFmpeg. Outputs go to public/derived/
 * (gitignored). Re-run after changing those config entries.
 *
 *   npm run derive
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DERIVED, FREEZES, RECORDINGS, TOOLING, VIDEO } from "../src/config";

const pub = path.join(process.cwd(), "public");
const dir = process.env.OPTIMUS_FFMPEG_DIR ?? TOOLING.ffmpegDir;
const ffmpeg = path.join(dir, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
if (!existsSync(ffmpeg)) throw new Error(`ffmpeg not found at ${ffmpeg} (set OPTIMUS_FFMPEG_DIR)`);
mkdirSync(path.join(pub, "derived"), { recursive: true });

const run = (args: string[]) => {
  const r = spawnSync(ffmpeg, ["-v", "error", "-y", ...args], { shell: false, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
};

for (const [id, d] of Object.entries(DERIVED)) {
  const src = path.join(pub, RECORDINGS[d.from].file);
  const speed = (d.end - d.start) / d.seconds;
  // Every output frame is a real source frame; setpts compresses time, fps keeps 60 fps output.
  run([
    "-ss", String(d.start), "-to", String(d.end), "-i", src,
    "-an", "-vf", `setpts=(PTS-STARTPTS)/${speed},fps=${VIDEO.fps}`,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-g", String(VIDEO.fps), "-pix_fmt", "yuv420p",
    path.join(pub, d.file),
  ]);
  console.log(`${id.padEnd(12)} ${d.from} ${d.start}–${d.end} s → ${d.seconds} s (${speed.toFixed(1)}×)  ${d.file}`);
}

for (const [id, f] of Object.entries(FREEZES)) {
  run(["-ss", String(f.at), "-i", path.join(pub, RECORDINGS[f.from].file), "-frames:v", "1", path.join(pub, f.file)]);
  console.log(`${id.padEnd(12)} ${f.from} @ ${f.at} s  ${f.file}`);
}
