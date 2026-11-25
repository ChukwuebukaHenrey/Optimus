/**
 * Verifies a rendered file with the system ffprobe (brief §9 final file checks):
 * 1920×1080, 60 fps, H.264, duration ≤ the ceiling, and (unless --no-audio) an AAC track.
 *
 *   npm run probe                      (checks TOOLING.output)
 *   npm run probe -- out/other.mp4 --no-audio
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { TOOLING, VIDEO } from "../src/config";

const args = process.argv.slice(2);
const noAudio = args.includes("--no-audio");
const file = args.find((a) => !a.startsWith("--")) ?? TOOLING.output;
const dir = process.env.OPTIMUS_FFMPEG_DIR ?? TOOLING.ffmpegDir;
const ffprobe = path.join(dir, process.platform === "win32" ? "ffprobe.exe" : "ffprobe");

if (!existsSync(ffprobe)) {
  console.error(`ffprobe not found at ${ffprobe} (set OPTIMUS_FFMPEG_DIR)`);
  process.exit(2);
}
if (!existsSync(file)) {
  console.error(`no such file: ${file}`);
  process.exit(2);
}

const r = spawnSync(ffprobe, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], {
  encoding: "utf8",
  shell: false,
});
if (r.status !== 0) {
  console.error(r.stderr);
  process.exit(2);
}
type Stream = { codec_type: string; codec_name: string; width?: number; height?: number; r_frame_rate?: string };
const info = JSON.parse(r.stdout) as { streams: Stream[]; format: { duration: string } };
const v = info.streams.find((st) => st.codec_type === "video");
const a = info.streams.find((st) => st.codec_type === "audio");
const [num, den] = (v?.r_frame_rate ?? "0/1").split("/").map(Number);
const fps = num / den;
const duration = Number(info.format.duration);

const checks: Array<[string, boolean, string]> = [
  ["resolution", v?.width === VIDEO.width && v?.height === VIDEO.height, `${v?.width}×${v?.height}`],
  ["frame rate", Math.abs(fps - VIDEO.fps) < 0.01, `${fps.toFixed(3)} fps`],
  ["video codec", v?.codec_name === "h264", String(v?.codec_name)],
  ["duration", duration <= VIDEO.maxSeconds, `${duration.toFixed(3)} s (≤ ${VIDEO.maxSeconds} s)`],
  ...(noAudio ? [] : ([["audio codec", a?.codec_name === "aac", String(a?.codec_name ?? "none")]] as Array<[string, boolean, string]>)),
];

let ok = true;
for (const [name, pass, got] of checks) {
  ok &&= pass;
  console.log(`${pass ? "ok    " : "FAILED"} ${name.padEnd(12)} ${got}`);
}
process.exit(ok ? 0 : 1);
