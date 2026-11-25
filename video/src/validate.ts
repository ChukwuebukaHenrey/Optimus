/**
 * Validates src/config.ts against the brief's rules. Used by `npm run check` and at Studio/render
 * start-up (Root.tsx), so an invalid config can never render.
 */
import { z } from "zod";
import {
  AUDIO,
  COUNTERS,
  copy,
  DURATION_IN_FRAMES,
  FACTS,
  MOTION,
  MUSIC_EDIT,
  PIXEL_ART,
  RECORDINGS,
  SCENES,
  VIDEO,
  VO,
  VO_TAKE,
  type Footage,
} from "./config";

const copySchema = z.union([z.string().min(1), z.object({ live: z.string().min(1), archived: z.string().min(1) })]);

const sceneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  storyFunction: z.string().min(1),
  frames: z.number().int().positive(),
  picture: z.string().min(1),
  recordings: z.array(z.string()),
  lines: z.array(z.object({ id: z.string().min(1), text: copySchema, at: z.number().int().nonnegative() })),
  vo: z.string().min(1),
  reviewCriterion: z.string().min(1),
  needsApproval: z.boolean().optional(),
});

/**
 * Every number that may appear on screen must come from an approved fact (brief §3): a fact value,
 * or the length of a fact list (e.g. two issue numbers → "2 Kane bugs").
 */
const approvedNumbers = (): Set<string> => {
  const out = new Set<string>();
  const walk = (v: unknown): void => {
    if (typeof v === "number") out.add(String(v));
    else if (Array.isArray(v)) {
      out.add(String(v.length));
      v.forEach(walk);
    }
    else if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) if (k !== "claim" && k !== "sources") walk(val);
    }
  };
  walk(FACTS);
  return out;
};

export type CheckResult = { errors: string[]; warnings: string[] };

export const checkConfig = (): CheckResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Shape
  SCENES.forEach((sc, i) => {
    const r = sceneSchema.safeParse(sc);
    if (!r.success) errors.push(`scene[${i}] (${sc.id}): ${r.error.message}`);
  });

  // Canvas and total length
  if (VIDEO.width !== 1920 || VIDEO.height !== 1080 || VIDEO.fps !== 60)
    errors.push(`canvas must be 1920×1080 @ 60 fps (brief §4), got ${VIDEO.width}×${VIDEO.height} @ ${VIDEO.fps}`);
  const maxFrames = VIDEO.maxSeconds * VIDEO.fps;
  if (DURATION_IN_FRAMES > maxFrames)
    errors.push(`total ${DURATION_IN_FRAMES} frames exceeds the ${VIDEO.maxSeconds} s ceiling (${maxFrames} frames)`);

  // Unique ids
  const ids = SCENES.map((s) => s.id);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) errors.push(`duplicate scene ids: ${dup.join(", ")}`);

  const numbers = approvedNumbers();
  const footages: Footage[] = ["live", "archived"];

  for (const sc of SCENES) {
    if (!(sc.vo in VO)) errors.push(`scene ${sc.id}: unknown voiceover id ${sc.vo}`);
    for (const r of sc.recordings) if (!(r in RECORDINGS)) errors.push(`scene ${sc.id}: unknown recording ${r}`);

    const lineIds = sc.lines.map((l) => l.id);
    if (new Set(lineIds).size !== lineIds.length) errors.push(`scene ${sc.id}: duplicate line ids`);

    // Each line: inside the scene, and readable ≥ readHold before the next *later* line or the scene end.
    const starts = [...new Set(sc.lines.map((l) => l.at))].sort((a, b) => a - b);
    for (const line of sc.lines) {
      if (line.at >= sc.frames) {
        errors.push(`scene ${sc.id} line "${line.id}": starts at frame ${line.at}, after the scene ends (${sc.frames})`);
        continue;
      }
      const next = starts.find((t) => t > line.at) ?? sc.frames;
      const visible = next - line.at - MOTION.entrance;
      if (visible < MOTION.readHold)
        errors.push(
          `scene ${sc.id} line "${line.id}": readable for ${(visible / VIDEO.fps).toFixed(2)} s after its entrance; needs ≥ ${(MOTION.readHold / VIDEO.fps).toFixed(1)} s`,
        );

      // Numbers on screen must trace to FACTS. Identifiers such as R1, L4 or v5 are not numbers.
      for (const f of footages) {
        const text = copy(line.text, f);
        for (const n of text.match(/(?<![A-Za-z\d])\d[\d,]*/g) ?? []) {
          const plain = n.replace(/,/g, "");
          if (!numbers.has(plain))
            errors.push(`scene ${sc.id} line "${line.id}" (${f}): number ${n} is not an approved fact (brief §3)`);
        }
        if (/\[.*\]/.test(text)) warnings.push(`scene ${sc.id} line "${line.id}" (${f}): placeholder copy: ${text}`);
      }
    }
  }

  // Voiceover placeholders
  for (const [id, c] of Object.entries(VO))
    for (const f of footages)
      if (/\[.*\]/.test(copy(c, f))) warnings.push(`${id} (${f}): placeholder sentence still in the script`);

  // Counters reference scenes that exist
  for (const c of COUNTERS) if (!ids.includes(c.scene)) errors.push(`counter ${c.id}: unknown scene ${c.scene}`);
  // Music edit covers the whole film; every voice block ends inside its scene with a small tail.
  const musicSeconds = MUSIC_EDIT.pieces.reduce((sum, [a, b]) => sum + (b - a), 0);
  const filmSeconds = DURATION_IN_FRAMES / VIDEO.fps;
  if (Math.abs(musicSeconds - filmSeconds) > 0.25)
    errors.push(`music edit is ${musicSeconds.toFixed(2)} s but the film is ${filmSeconds.toFixed(2)} s`);
  for (const sc of SCENES)
    for (const clip of VO_TAKE.blocks[sc.vo as keyof typeof VO_TAKE.blocks]) {
      const end = clip.at + (clip.take[1] - clip.take[0]);
      if (end > sc.frames / VIDEO.fps - 0.3)
        errors.push(`scene ${sc.id}: a ${sc.vo} clip ends at ${end.toFixed(2)} s, too close to the scene end (${(sc.frames / VIDEO.fps).toFixed(2)} s)`);
    }
  for (const c of AUDIO.sfxCues) if (!ids.includes(c.scene)) errors.push(`sfx cue ${c.id}: unknown scene ${c.scene}`);

  // Facts carry evidence
  for (const [k, fact] of Object.entries(FACTS)) if (!fact.sources.length) errors.push(`fact ${k}: no source`);

  // Pixel art: whole-number scales that fit the canvas
  for (const [k, a] of Object.entries(PIXEL_ART)) {
    if (!Number.isInteger(a.scale) || a.scale < 1) errors.push(`pixel art ${k}: scale must be a whole number`);
    if (a.width * a.scale > VIDEO.width || a.height * a.scale > VIDEO.height)
      errors.push(`pixel art ${k}: ${a.width * a.scale}×${a.height * a.scale} overflows the canvas`);
  }

  if (!AUDIO.music.approved) warnings.push(`music: ${AUDIO.music.source} track awaits the owner's approval (brief §11)`);
  const approvals = SCENES.filter((s) => s.needsApproval).map((s) => s.id);
  if (approvals.length) warnings.push(`creative approval needed before the full render: scenes ${approvals.join(", ")}`);

  return { errors, warnings };
};

/** Throws on any error: called at module load in Root.tsx. */
export const assertConfig = (): void => {
  const { errors } = checkConfig();
  if (errors.length) throw new Error(`Invalid video config (src/config.ts):\n- ${errors.join("\n- ")}`);
};
