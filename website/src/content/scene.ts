/**
 * Hero scene layout in native art pixels (the plate is 640x360).
 * Change positions or timing here instead of regenerating art (asset management).
 */
import layers from "./hero-layers.json";
import frameData from "./agent-frames.json";

/** Frame indices into an agent's strip (website/scripts/extract_art.py → agent-frames.json). */
export interface AgentFrames {
  rest: number;
  blink: number;
  /** A-06 row 3: the action; first and last are the rest pose. */
  action: number[];
  /** A-06 row 1: front, front-right, right, back-right, back, back-left, left, front-left. */
  turn: number[];
  /** A-06 row 2: walk cycle facing right (absent for the seated runner). */
  walk?: number[];
}
const frames: Record<string, { frameWidth: number; frameHeight: number; anchorX: number; count: number; frames: AgentFrames }> = frameData;

export const SCENE = { w: 640, h: 360 } as const;
export const FOOT_Y = 305; // terrace surface where the agents stand

export interface AgentSpec {
  id: "contract" | "runner" | "evidence" | "verdict" | "smith";
  name: string;
  caption: string;
  href: string;
  /** Rest pose + blink (2 frames), for the page sections. */
  sprite: string;
  /** Every frame on one canvas, for the hero (`count` frames, indexed by `frames`). */
  sheet: string;
  count: number;
  frames: AgentFrames;
  frameW: number;
  frameH: number;
  /** Where the rest pose's body is centred inside the frame (native px from its left edge). */
  anchorX: number;
  /** Centre x of the agent's body on the terrace. */
  x: number;
  /** Where the hand-off spark touches this agent's prop (native px). */
  prop: { x: number; y: number } | null;
  /** Shown in the hero on phones (the four that fit: all but the Smith, at the right edge). */
  mobile: boolean;
}

type Placement = Omit<AgentSpec, "sprite" | "sheet" | "count" | "frames" | "frameW" | "frameH" | "anchorX">;

/** Frame sizes come from the art pipeline (website/scripts/extract_art.py → agent-frames.json). */
function agent(p: Placement): AgentSpec {
  const f = frames[p.id];
  return {
    ...p,
    sprite: `/art/agents/${p.id}.png`,
    sheet: `/art/agents/${p.id}-sheet.png`,
    count: f.count,
    frames: f.frames,
    frameW: f.frameWidth,
    frameH: f.frameHeight,
    anchorX: f.anchorX,
  };
}

export const AGENTS: AgentSpec[] = [
  agent({
    id: "contract", name: "The contract", caption: "One approved pack for every build", href: "#contract",
    x: 198, prop: { x: 216, y: 268 }, mobile: true,
  }),
  agent({
    id: "runner", name: "The browser run", caption: "Kane acts and records", href: "#evidence",
    x: 290, prop: { x: 304, y: 282 }, mobile: true,
  }),
  agent({
    id: "evidence", name: "The evidence", caption: "Every step, every screenshot", href: "#evidence",
    x: 384, prop: { x: 404, y: 270 }, mobile: true,
  }),
  agent({
    id: "verdict", name: "The verdict", caption: "Optimus decides, deterministically", href: "#verdicts",
    x: 477, prop: { x: 494, y: 266 }, mobile: true,
  }),
  agent({
    id: "smith", name: "The repair", caption: "A coding agent fixes a verified failure", href: "#repair",
    x: 566, prop: null, mobile: false,
  }),
];

export const HERO_LAYERS = layers;

/** Percent helpers for absolute positioning inside the 16:9 scene box. */
export const px = (x: number) => `${(x / SCENE.w) * 100}%`;
export const py = (y: number) => `${(y / SCENE.h) * 100}%`;
