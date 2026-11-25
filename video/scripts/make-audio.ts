/**
 * Builds the three audio stems, 48 kHz stereo, aligned to frame 0 (brief §2):
 *   public/audio/music.wav  the owner's reference track, edited on its bar grid (config MUSIC_EDIT)
 *   public/audio/vo.wav     the owner's ElevenLabs take, cut into blocks and placed per scene (VO_TAKE)
 *   public/audio/sfx.wav    three synthesised cues, timed from SHOTS + MOTION (no samples)
 * Re-run after any re-cut: everything is read from src/config.ts.
 *
 *   npm run audio
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { AUDIO, DURATION_IN_FRAMES, MOTION, MUSIC_EDIT, SHOTS, TIMELINE, TOOLING, VIDEO, VO_TAKE, type VoId } from "../src/config";

const SR = 48000;
const DUR = DURATION_IN_FRAMES / VIDEO.fps;
const N = Math.ceil(DUR * SR);
const pub = path.join(process.cwd(), "public");
const ffmpeg = path.join(process.env.OPTIMUS_FFMPEG_DIR ?? TOOLING.ffmpegDir, "ffmpeg.exe");
const sceneStart = (id: string) => {
  const sc = TIMELINE.find((s) => s.id === id);
  if (!sc) throw new Error(`unknown scene ${id}`);
  return sc.from / VIDEO.fps;
};
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

class Bus {
  l = new Float32Array(N);
  r = new Float32Array(N);
  add(i: number, v: number, pan = 0) {
    if (i < 0 || i >= N) return;
    const a = ((pan + 1) * Math.PI) / 4;
    this.l[i] += v * Math.cos(a);
    this.r[i] += v * Math.sin(a);
  }
}

/** Decodes any audio file to 48 kHz float32 stereo with the system FFmpeg. */
const decode = (file: string): { l: Float32Array; r: Float32Array } => {
  const r = spawnSync(ffmpeg, ["-v", "error", "-i", file, "-f", "f32le", "-ac", "2", "-ar", String(SR), "-"], { shell: false, maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(String(r.stderr));
  const all = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
  const n = all.length / 2;
  const l = new Float32Array(n);
  const rr = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    l[i] = all[2 * i];
    rr[i] = all[2 * i + 1];
  }
  return { l, r: rr };
};

// ---------------------------------------------------------------------------------------------
// Music: back-to-back pieces of the reference, equal-power crossfades centred on each join.
// ---------------------------------------------------------------------------------------------

const buildMusic = () => {
  const src = decode(path.join(pub, MUSIC_EDIT.file));
  const out = new Bus();
  const half = Math.round((MUSIC_EDIT.crossfade / 2) * SR);
  let at = 0; // output sample where this piece starts
  for (const [i, [a, b]] of MUSIC_EDIT.pieces.entries()) {
    const s0 = Math.round(a * SR);
    const len = Math.round((b - a) * SR);
    const first = i === 0;
    const last = i === MUSIC_EDIT.pieces.length - 1;
    // Each piece spills `half` samples beyond both ends; the overlap is crossfaded.
    for (let j = first ? 0 : -half; j < len + (last ? 0 : half); j++) {
      const k = s0 + j;
      if (k < 0 || k >= src.l.length) continue;
      let g = 1;
      if (!first && j < half) g *= Math.sin((Math.PI / 2) * ((j + half) / (2 * half)));
      if (!last && j >= len - half) g *= Math.cos((Math.PI / 2) * ((j - (len - half)) / (2 * half)));
      const o = at + j;
      if (o < 0 || o >= N) continue;
      out.l[o] += src.l[k] * g;
      out.r[o] += src.r[k] * g;
    }
    at += len;
  }
  const fadeIn = MUSIC_EDIT.fadeIn * SR;
  for (let n = 0; n < Math.min(N, fadeIn); n++) {
    out.l[n] *= n / fadeIn;
    out.r[n] *= n / fadeIn;
  }
  return { out, seconds: at / SR };
};

// ---------------------------------------------------------------------------------------------
// Voice: each block cut from the take (10 ms fades) and placed `at` seconds into its scene.
// ---------------------------------------------------------------------------------------------

const buildVoice = () => {
  const take = decode(path.join(pub, VO_TAKE.file));
  const out = new Bus();
  const fade = Math.round(0.01 * SR);
  const placed: Array<{ id: string; take: readonly [number, number]; from: number; to: number }> = [];
  for (const sc of TIMELINE)
    for (const clip of VO_TAKE.blocks[sc.vo as VoId]) {
      const [a, b] = clip.take;
      const s0 = Math.round(a * SR);
      const len = Math.round((b - a) * SR);
      const o0 = Math.round((sc.from / VIDEO.fps + clip.at) * SR);
      for (let j = 0; j < len; j++) {
        const g = Math.min(1, j / fade, (len - j) / fade);
        out.l[o0 + j] += take.l[s0 + j] * g;
        out.r[o0 + j] += take.r[s0 + j] * g;
      }
      placed.push({ id: sc.vo, take: clip.take, from: o0 / SR, to: (o0 + len) / SR });
    }
  return { out, placed };
};

// ---------------------------------------------------------------------------------------------
// SFX: three restrained synthesised cues on the frames where the picture changes.
// ---------------------------------------------------------------------------------------------

let seed = 0x9e3779b9;
const rnd = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};
type Wave = "pulse" | "sine";
const tone = (bus: Bus, o: { t: number; dur: number; f: number; wave: Wave; amp: number; a?: number; r?: number; decay?: number; lp?: number; pan?: number }) => {
  const a = o.a ?? 0.005;
  const r = o.r ?? 0.05;
  const i0 = Math.floor(o.t * SR);
  const k = o.lp ? 1 - Math.exp((-2 * Math.PI * o.lp) / SR) : 1;
  let y = 0;
  let ph = 0;
  for (let j = 0; j < (o.dur + r) * SR; j++) {
    const t = j / SR;
    let env = Math.min(1, t / a) * (o.decay ? Math.exp(-t / o.decay) : 1);
    if (t > o.dur) env *= Math.max(0, 1 - (t - o.dur) / r);
    const p = ph - Math.floor(ph);
    const x = o.wave === "sine" ? Math.sin(2 * Math.PI * p) : p < 0.25 ? 1 : -0.33;
    ph += o.f / SR;
    y += k * (x - y);
    bus.add(i0 + j, y * env * o.amp, o.pan ?? 0);
  }
};
const noise = (bus: Bus, o: { t: number; dur: number; amp: number; lp: number; decay: number }) => {
  const i0 = Math.floor(o.t * SR);
  const k = 1 - Math.exp((-2 * Math.PI * o.lp) / SR);
  let y = 0;
  for (let j = 0; j < o.dur * SR; j++) {
    y += k * (rnd() - y);
    bus.add(i0 + j, y * Math.exp(-j / SR / o.decay) * o.amp);
  }
};

const buildSfx = () => {
  const out = new Bus();
  const punch = MOTION.punchIn / VIDEO.fps;
  const cues = {
    "contradiction-impact": sceneStart("1") + SHOTS["1"].broken.from,
    "fail-confirmed": sceneStart("4b") + SHOTS["4b"].fail.from + SHOTS["4b"].fail.focusAt + punch,
    "pass-verified": sceneStart("4f") + SHOTS["4f"].pass.from + SHOTS["4f"].pass.focusAt + punch,
  };
  const c1 = cues["contradiction-impact"];
  tone(out, { t: c1, dur: 0.05, f: 48, wave: "sine", amp: 0.7, a: 0.002, r: 1.4, decay: 0.5 });
  noise(out, { t: c1, dur: 0.9, amp: 0.35, lp: 1800, decay: 0.12 });
  const c2 = cues["fail-confirmed"];
  tone(out, { t: c2, dur: 0.1, f: mtof(64), wave: "pulse", amp: 0.16, a: 0.003, r: 0.2, lp: 1600 });
  tone(out, { t: c2 + 0.13, dur: 0.22, f: mtof(60), wave: "pulse", amp: 0.16, a: 0.003, r: 0.35, lp: 1300 });
  const c3 = cues["pass-verified"];
  for (const [i, m] of [77, 84].entries())
    for (const [h, g] of [[1, 1], [2.76, 0.3], [5.4, 0.1]] as const)
      tone(out, { t: c3 + i * 0.16, dur: 0.05, f: mtof(m) * h, wave: "sine", amp: 0.2 * g, a: 0.003, r: 1.4, decay: 0.55, pan: 0.1 });
  return { out, cues };
};

// ---------------------------------------------------------------------------------------------
// Output: 16-bit PCM WAV, then loudness-normalise with the system FFmpeg.
// ---------------------------------------------------------------------------------------------

const writeWav = (file: string, bus: Bus) => {
  const data = Buffer.alloc(N * 4);
  for (let n = 0; n < N; n++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, bus.l[n])) * 32767), n * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, bus.r[n])) * 32767), n * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([h, data]));
};

const loudness = (file: string) => {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { shell: false, encoding: "utf8" });
  const s = r.stderr.slice(r.stderr.lastIndexOf("Summary:"));
  return { I: Number(/I:\s+(-?[\d.]+) LUFS/.exec(s)?.[1]), TP: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(s)?.[1]) };
};

/** Writes the bus, then applies gain to `lufs` with a -1.5 dBFS limiter. */
const writeNormalised = (name: string, bus: Bus, lufs: number) => {
  const raw = path.join(process.cwd(), "out", `${name}.raw.wav`);
  writeWav(raw, bus);
  const m0 = loudness(raw);
  const target = path.join(pub, "audio", `${name}.wav`);
  const r = spawnSync(ffmpeg, ["-v", "error", "-y", "-i", raw, "-af", `volume=${(lufs - m0.I).toFixed(2)}dB,alimiter=limit=0.84:level=false`, "-c:a", "pcm_s16le", target], { shell: false, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  const m1 = loudness(target);
  console.log(`${name}.wav: ${DUR.toFixed(2)} s, ${m1.I} LUFS integrated, true peak ${m1.TP} dBFS`);
};

mkdirSync(path.join(pub, "audio"), { recursive: true });
mkdirSync(path.join(process.cwd(), "out"), { recursive: true });

const music = buildMusic();
console.log(`music edit: ${MUSIC_EDIT.pieces.length} pieces, ${music.seconds.toFixed(2)} s for a ${DUR.toFixed(2)} s video`);
writeNormalised("music", music.out, AUDIO.music.stemLufs);

const voice = buildVoice();
for (const p of voice.placed) console.log(`  ${p.id.padEnd(6)} take ${p.take[0].toFixed(2)}–${p.take[1].toFixed(2)} → film ${p.from.toFixed(2)}–${p.to.toFixed(2)} s`);
writeNormalised("vo", voice.out, VO_TAKE.stemLufs);
// Where each block plays in the film, for scripts/vo-captions.py (captions follow the same placement).
writeFileSync(path.join(process.cwd(), "out", "vo-placements.json"), JSON.stringify(voice.placed, null, 2));

const sfx = buildSfx();
writeWav(path.join(pub, AUDIO.stems.sfx), sfx.out);
console.log("sfx.wav cues (s):", Object.fromEntries(Object.entries(sfx.cues).map(([k, v]) => [k, Number(v.toFixed(3))])));
