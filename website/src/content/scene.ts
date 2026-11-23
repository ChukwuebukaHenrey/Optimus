/**
 * Hero scene layout in native art pixels (the plate is 640x360).
 * Change positions or timing here instead of regenerating art (AGENT_BUILD_PROMPT, asset management).
 */
import layers from "./hero-layers.json";

export const SCENE = { w: 640, h: 360 } as const;
export const FOOT_Y = 305; // terrace surface where the agents stand

export interface AgentSpec {
  id: "contract" | "runner" | "evidence" | "verdict" | "smith";
  name: string;
  caption: string;
  href: string;
  sprite: string;
  frameW: number;
  frameH: number;
  /** Centre x of the sprite on the terrace. */
  x: number;
  /** Where the hand-off spark touches this agent's prop (native px). */
  prop: { x: number; y: number } | null;
  blink: number;
  blinkDelay: number;
  /** Shown in the hero on phones (three agents only). */
  mobile: boolean;
}

export const AGENTS: AgentSpec[] = [
  {
    id: "contract", name: "The contract", caption: "One approved pack for every build", href: "#contract",
    sprite: "/art/agents/contract.png", frameW: 70, frameH: 80, x: 198, prop: { x: 216, y: 268 },
    blink: 4.3, blinkDelay: -1.1, mobile: true,
  },
  {
    id: "runner", name: "The browser run", caption: "Kane acts and records", href: "#evidence",
    sprite: "/art/agents/runner.png", frameW: 67, frameH: 70, x: 290, prop: { x: 304, y: 282 },
    blink: 5.1, blinkDelay: -3.2, mobile: true,
  },
  {
    id: "evidence", name: "The evidence", caption: "Every step, every screenshot", href: "#evidence",
    sprite: "/art/agents/evidence.png", frameW: 73, frameH: 69, x: 384, prop: { x: 404, y: 270 },
    blink: 5.9, blinkDelay: -0.4, mobile: false,
  },
  {
    id: "verdict", name: "The verdict", caption: "Optimus decides, deterministically", href: "#verdicts",
    sprite: "/art/agents/verdict.png", frameW: 74, frameH: 82, x: 477, prop: { x: 494, y: 266 },
    blink: 6.7, blinkDelay: -2.6, mobile: true,
  },
  {
    id: "smith", name: "The repair", caption: "A coding agent fixes a verified failure", href: "#repair",
    sprite: "/art/agents/smith.png", frameW: 98, frameH: 86, x: 566, prop: null,
    blink: 7.3, blinkDelay: -5.0, mobile: false,
  },
];

export const HERO_LAYERS = layers;

/** Percent helpers for absolute positioning inside the 16:9 scene box. */
export const px = (x: number) => `${(x / SCENE.w) * 100}%`;
export const py = (y: number) => `${(y / SCENE.h) * 100}%`;
