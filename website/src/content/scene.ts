/**
 * Hero scene layout in native art pixels (the plate is 640x360).
 * Change positions or timing here instead of regenerating art (AGENT_BUILD_PROMPT, asset management).
 */
import layers from "./hero-layers.json";
import frames from "./agent-frames.json";

export const SCENE = { w: 640, h: 360 } as const;
export const FOOT_Y = 305; // terrace surface where the agents stand

export interface AgentSpec {
  id: "contract" | "runner" | "evidence" | "verdict" | "smith";
  name: string;
  caption: string;
  href: string;
  /** Rest pose + blink (2 frames). */
  sprite: string;
  /** The A-06 action row (actionFrames frames on the same canvas as the rest pose). */
  actionSprite: string;
  actionFrames: number;
  frameW: number;
  frameH: number;
  /** Where the rest pose's body is centred inside the frame (native px from its left edge). */
  anchorX: number;
  /** Centre x of the agent's body on the terrace. */
  x: number;
  /** Where the hand-off spark touches this agent's prop (native px). */
  prop: { x: number; y: number } | null;
  blink: number;
  blinkDelay: number;
  /** Shown in the hero on phones (three agents only). */
  mobile: boolean;
}

type Placement = Omit<AgentSpec, "sprite" | "actionSprite" | "actionFrames" | "frameW" | "frameH" | "anchorX">;

/** Frame sizes come from the art pipeline (website/scripts/extract_art.py → agent-frames.json). */
function agent(p: Placement): AgentSpec {
  const f = frames[p.id];
  return {
    ...p,
    sprite: `/art/agents/${p.id}.png`,
    actionSprite: `/art/agents/${p.id}-act.png`,
    actionFrames: f.actionFrames,
    frameW: f.frameWidth,
    frameH: f.frameHeight,
    anchorX: f.anchorX,
  };
}

export const AGENTS: AgentSpec[] = [
  agent({
    id: "contract", name: "The contract", caption: "One approved pack for every build", href: "#contract",
    x: 198, prop: { x: 216, y: 268 }, blink: 4.3, blinkDelay: -1.1, mobile: true,
  }),
  agent({
    id: "runner", name: "The browser run", caption: "Kane acts and records", href: "#evidence",
    x: 290, prop: { x: 304, y: 282 }, blink: 5.1, blinkDelay: -3.2, mobile: true,
  }),
  agent({
    id: "evidence", name: "The evidence", caption: "Every step, every screenshot", href: "#evidence",
    x: 384, prop: { x: 404, y: 270 }, blink: 5.9, blinkDelay: -0.4, mobile: false,
  }),
  agent({
    id: "verdict", name: "The verdict", caption: "Optimus decides, deterministically", href: "#verdicts",
    x: 477, prop: { x: 494, y: 266 }, blink: 6.7, blinkDelay: -2.6, mobile: true,
  }),
  agent({
    id: "smith", name: "The repair", caption: "A coding agent fixes a verified failure", href: "#repair",
    x: 566, prop: null, blink: 7.3, blinkDelay: -5.0, mobile: false,
  }),
];

export const HERO_LAYERS = layers;

/** Percent helpers for absolute positioning inside the 16:9 scene box. */
export const px = (x: number) => `${(x / SCENE.w) * 100}%`;
export const py = (y: number) => `${(y / SCENE.h) * 100}%`;
