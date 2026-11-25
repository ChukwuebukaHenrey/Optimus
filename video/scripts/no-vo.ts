/**
 * The brief's second deliverable (§2): the same film WITHOUT the voiceover. Only the audio differs,
 * so this renders the composition's audio with the voice track off (light and quick), muxes it with
 * the already-rendered video stream (copied, not re-encoded), then masters it with the SAME gain as
 * the main mix, so music and effects sit exactly where they do under the voice.
 *
 *   npm run render:novo      (after `npm run render`)
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { TOOLING, VIDEO } from "../src/config";

const out = (f: string) => path.join(process.cwd(), "out", f);
const main = out("optimus-demo.raw.mp4");
if (!existsSync(main)) throw new Error("render the main film first: npm run render");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const ffmpeg = path.join(process.env.OPTIMUS_FFMPEG_DIR ?? TOOLING.ffmpegDir, "ffmpeg.exe");

const run = (cmd: string, args: string[]) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: cmd === npx });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed`);
};

run(npx, ["remotion", "render", VIDEO.id, out("no-vo-audio.wav"), "--codec=wav", `--props=${JSON.stringify(JSON.stringify({ voice: false }))}`]);
run(ffmpeg, ["-v", "error", "-y", "-i", main, "-i", out("no-vo-audio.wav"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "pcm_s16le", out("optimus-demo-no-vo.raw.mov")]);
run(npx, ["tsx", "scripts/master.ts", out("optimus-demo-no-vo.raw.mov"), out("optimus-demo-no-vo.mp4"), "--match", main]);
