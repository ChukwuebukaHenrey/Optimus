"use client";

import { motion, useReducedMotion } from "motion/react";
import { AGENTS, FOOT_Y, px, py, type AgentSpec } from "@/content/scene";

/**
 * The five agents and the hand-off, on one shared 10-second cycle (Motion).
 * The spark leaves the contract, reaches the browser run, the evidence and the verdict; each agent
 * plays its drawn action frames (A-06) when it arrives. Positions come from scene.ts, so moving an
 * agent moves its action too. Nothing is flipped or nudged: every pose is a real drawn frame.
 */
const CYCLE = 10;
const ARRIVE = [0.08, 0.18, 0.32, 0.46]; // contract (departure), runner, evidence, verdict
const loop = (times: number[]) => ({ duration: CYCLE, times, repeat: Infinity, ease: "easeInOut" as const });

/** When each agent plays its action row, as fractions of the cycle. */
const ACTION_WINDOW: Record<AgentSpec["id"], [number, number]> = {
  contract: [0.005, 0.125], // picks up the scroll, holds it out as the spark leaves (frames 5–7)
  runner: [ARRIVE[1], 0.3], // opens the laptop, types, looks up
  evidence: [ARRIVE[2], 0.46], // kneels, picks up the frame, inspects it
  verdict: [ARRIVE[3], 0.6], // writes the tick, shows the clipboard
  smith: [0.62, 0.78], // sets the { } tile and taps it in once the verdict lands
};
const HOLD = 0.0005; // a 5 ms crossover: keyframes this close read as a cut, not a blend

/** Opacity of the rest sprite (1) and the action strip (0), swapping for the action window. */
function swap([start, end]: [number, number], during: number) {
  const before = 1 - during;
  return { values: [before, before, during, during, before, before], times: [0, start, start + HOLD, end - HOLD, end, 1] };
}

/** Strip offsets that hold each frame for an equal share of the action window. */
function frameSteps([start, end]: [number, number], frames: number) {
  const at = (i: number) => `translateX(${(-i / frames) * 100}%)`;
  const step = (end - start) / frames;
  const values = [at(0)];
  const times = [0];
  for (let i = 0; i < frames; i++) {
    values.push(at(i), at(i));
    times.push(start + i * step + (i === 0 ? 0 : HOLD), start + (i + 1) * step);
  }
  values.push(at(frames - 1));
  times.push(1);
  return { values, times };
}

function sparkPath() {
  const stops = AGENTS.filter((a) => a.prop && a.id !== "smith").map((a) => a.prop!);
  const x: string[] = [];
  const y: string[] = [];
  const opacity: number[] = [];
  const times: number[] = [];
  const at = (t: number, p: { x: number; y: number }, o: number) => {
    times.push(t);
    x.push(px(p.x));
    y.push(py(p.y));
    opacity.push(o);
  };
  at(0, stops[0], 0);
  at(ARRIVE[0], stops[0], 1);
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    at((ARRIVE[i - 1] + ARRIVE[i]) / 2, { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 16 }, 1);
    at(ARRIVE[i], b, 1);
  }
  const last = stops[stops.length - 1];
  at(ARRIVE[ARRIVE.length - 1] + 0.02, last, 0);
  at(1, last, 0);
  return { x, y, opacity, times };
}

/** A 7x6 pixel tick, drawn on the art grid. */
function PixelTick() {
  const cells = [[6, 0], [5, 1], [6, 1], [4, 2], [5, 2], [0, 3], [3, 3], [4, 3], [1, 4], [2, 4], [3, 4], [2, 5]];
  return (
    <svg viewBox="0 0 7 6" shapeRendering="crispEdges" className="size-full" aria-hidden="true">
      {cells.map(([cx, cy]) => (
        <rect key={`${cx}-${cy}`} x={cx} y={cy} width="1" height="1" fill="var(--lime)" />
      ))}
    </svg>
  );
}

export function HeroCast() {
  const spark = sparkPath();
  const verdict = AGENTS.find((a) => a.id === "verdict")!;
  // Reduced motion: the agents keep their rest pose (MotionConfig only stops transforms by itself).
  const still = useReducedMotion() ?? false;
  return (
    <>
      <ul className="contents">
        {AGENTS.map((a) => {
          const span = ACTION_WINDOW[a.id];
          const rest = swap(span, 0);
          const acting = swap(span, 1);
          const steps = frameSteps(span, a.actionFrames);
          const linear = (times: number[]) => ({ duration: CYCLE, times, repeat: Infinity, ease: "linear" as const });
          return (
            <li key={a.id} className={a.mobile ? "contents" : "contents max-md:hidden"}>
              <motion.a
                href={a.href}
                className="group absolute block rounded-sm"
                style={{ left: px(a.x - a.anchorX), top: py(FOOT_Y - a.frameH), width: px(a.frameW), height: py(a.frameH) }}
                aria-label={`${a.name}: ${a.caption}`}
                whileHover={{ y: "-4%" }}
                whileFocus={{ y: "-4%" }}
                transition={{ type: "spring", bounce: 0.2, visualDuration: 0.25 }}
              >
                <motion.span
                  aria-hidden="true"
                  className="agent-sprite absolute inset-0"
                  style={{
                    backgroundImage: `url(${a.sprite})`,
                    ["--blink" as string]: `${a.blink}s`,
                    ["--blink-delay" as string]: `${a.blinkDelay}s`,
                  }}
                  initial={{ opacity: 1 }}
                  animate={still ? { opacity: 1 } : { opacity: rest.values }}
                  transition={still ? undefined : linear(rest.times)}
                />
                {/* The strip slides by whole frames inside a clipping window. Opacity and transform
                    both run as Web Animations, so frames and the rest/action swap share one clock. */}
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={still ? { opacity: 0 } : { opacity: acting.values }}
                  transition={still ? undefined : linear(acting.times)}
                >
                  <motion.span
                    className="agent-action absolute inset-y-0 left-0 block"
                    style={{ width: `${a.actionFrames * 100}%`, backgroundImage: `url(${a.actionSprite})` }}
                    initial={{ transform: "translateX(0%)" }}
                    animate={still ? undefined : { transform: steps.values }}
                    transition={still ? undefined : linear(steps.times)}
                  />
                </motion.span>
                <span
                  aria-hidden="true"
                  className="glass pointer-events-none absolute bottom-full left-1/2 mb-2 w-max max-w-56 -translate-x-1/2 rounded-sm px-3 py-2 text-left text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <span className="block font-extrabold">{a.name}</span>
                  <span className="block">{a.caption}</span>
                </span>
              </motion.a>
            </li>
          );
        })}
      </ul>

      <motion.span
        aria-hidden="true"
        className="handoff-track max-md:hidden"
        animate={{ x: spark.x, y: spark.y, opacity: spark.opacity }}
        transition={{ duration: CYCLE, times: spark.times, repeat: Infinity, ease: "linear" }}
      >
        <span className="handoff" />
      </motion.span>
      <motion.span
        aria-hidden="true"
        className="handoff-tick"
        style={{ left: px(verdict.x - 4), top: py(FOOT_Y - verdict.frameH - 14), width: px(8), height: py(7) }}
        animate={{ opacity: [0, 0, 1, 1, 0, 0], y: ["40%", "40%", "0%", "0%", "-40%", "-40%"] }}
        transition={loop([0, 0.54, 0.57, 0.7, 0.74, 1])}
      >
        <PixelTick />
      </motion.span>
    </>
  );
}
