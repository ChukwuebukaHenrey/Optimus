/** Resolves config shot entries to Shot media + source sizes. */
import { DERIVED, FREEZES, RECORDINGS, SOURCE_SIZE, STILLS, VIDEO, type RecordingId } from "../config";

const FULL = { w: 1920, h: 1080 };

export const rec = (id: RecordingId, trimSeconds = 0) => ({
  media: { video: RECORDINGS[id].file, trimBefore: Math.round(trimSeconds * VIDEO.fps) },
  source: SOURCE_SIZE[id],
});

export const derived = (id: keyof typeof DERIVED) => ({
  media: { video: DERIVED[id].file },
  source: SOURCE_SIZE[DERIVED[id].from],
});

export const freeze = (id: keyof typeof FREEZES) => ({
  media: { image: FREEZES[id].file },
  source: SOURCE_SIZE[FREEZES[id].from],
});

/** Kane's end-of-step screenshots (1920×1080). */
export const still = (id: keyof typeof STILLS) => {
  const file = STILLS[id];
  if (!file) throw new Error(`still ${id} is not available`);
  return { media: { image: file }, source: FULL, frame: { x: 0, y: 0, ...FULL } };
};
