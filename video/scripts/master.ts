/**
 * Masters a rendered MP4's audio to the brief's delivery spec (§2: -14 LUFS integrated, true peak
 * <= -1 dBTP) with two-pass EBU R128 loudness normalisation. The video stream is copied untouched.
 *
 *   npm run master -- out/optimus-demo.raw.mp4 out/optimus-demo.mp4
 *   npm run master -- <in> <out> --match out/optimus-demo.raw.mp4
 *     applies the SAME gain the main mix needed (for the no-voiceover version, so its music and
 *     effects sit exactly where they do under the voice) instead of normalising this file.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { AUDIO, TOOLING } from "../src/config";

const [input, output, flag, matchFile] = process.argv.slice(2);
const match = flag === "--match" ? matchFile : undefined;
if (!input || !output) throw new Error("usage: master <input.mp4> <output.mp4>");
const ffmpeg = path.join(process.env.OPTIMUS_FFMPEG_DIR ?? TOOLING.ffmpegDir, "ffmpeg.exe");
/** TP -2.5 leaves room for the AAC encoder's overshoot, so the delivered file stays under -1 dBTP. */
const target = `I=${AUDIO.levels.mixLufs}:TP=-2.5:LRA=11`;
/** Tame peaks first so the normaliser can raise the level linearly; finish with an oversampled limiter. */
const pre = "alimiter=limit=0.6:attack=2:release=60:level=false";
const post = "aresample=192000,alimiter=limit=0.7:attack=1:release=40:level=false,aresample=48000";

const pass1 = spawnSync(ffmpeg, ["-hide_banner", "-i", match ?? input, "-af", `${pre},loudnorm=${target}:print_format=json`, "-f", "null", "-"], { shell: false, encoding: "utf8" });
const json = pass1.stderr.slice(pass1.stderr.lastIndexOf("{"), pass1.stderr.lastIndexOf("}") + 1);
const m = JSON.parse(json) as Record<string, string>;
const gain = `volume=${(AUDIO.levels.mixLufs - Number(m.input_i)).toFixed(2)}dB`;
const measured = `measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;

const pass2 = spawnSync(
  ffmpeg,
  ["-v", "error", "-y", "-i", input, "-c:v", "copy", "-af", match ? `${pre},${gain},${post}` : `${pre},loudnorm=${target}:${measured},${post}`, "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart", output],
  { shell: false, encoding: "utf8" },
);
if (pass2.status !== 0) throw new Error(pass2.stderr);

const check = spawnSync(ffmpeg, ["-hide_banner", "-i", output, "-af", "ebur128=peak=true", "-f", "null", "-"], { shell: false, encoding: "utf8" });
const s = check.stderr.slice(check.stderr.lastIndexOf("Summary:"));
console.log(`${output}: ${/I:\s+(-?[\d.]+ LUFS)/.exec(s)?.[1]} integrated, true peak ${/Peak:\s+(-?[\d.]+ dBFS)/.exec(s)?.[1]} (input was ${m.input_i} LUFS, ${m.input_tp} dBTP)`);
