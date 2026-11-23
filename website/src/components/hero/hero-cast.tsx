"use client";

import { motion, type TargetAndTransition } from "motion/react";
import { AGENTS, FOOT_Y, px, py, type AgentSpec } from "@/content/scene";

/**
 * The five agents and the hand-off, on one shared 10-second cycle (Motion).
 * The spark leaves the contract, reaches the browser run, the evidence and the verdict; each agent
 * acts when it arrives. Positions come from scene.ts, so moving an agent moves its action too.
 */
const CYCLE = 10;
const ARRIVE = [0.04, 0.18, 0.32, 0.46]; // contract (departure), runner, evidence, verdict
const loop = (times: number[]) => ({ duration: CYCLE, times, repeat: Infinity, ease: "easeInOut" as const });

/** What each agent does in the cycle, as Motion keyframes (y and x in % of the sprite). */
const ACTIONS: Record<AgentSpec["id"], { animate: TargetAndTransition; times: number[] }> = {
  // glances back at the observatory, then turns and lifts the scroll to send it
  contract: {
    animate: { scaleX: [1, 1, -1, -1, 1, 1], y: ["0%", "-5%", "0%", "0%", "0%", "0%"] },
    times: [0, 0.03, 0.06, 0.8, 0.86, 1],
  },
  // types in short bursts while the evidence arrives
  runner: {
    animate: { y: ["0%", "0%", "-2%", "0%", "-2%", "0%", "-2%", "0%", "0%"] },
    times: [0, 0.17, 0.19, 0.21, 0.23, 0.25, 0.27, 0.29, 1],
  },
  // leans in with the magnifier to inspect
  evidence: {
    animate: { x: ["0%", "0%", "6%", "6%", "0%", "0%"], y: ["0%", "0%", "2%", "2%", "0%", "0%"] },
    times: [0, 0.31, 0.35, 0.42, 0.46, 1],
  },
  // stamps the verdict: a short hop as the tick appears
  verdict: {
    animate: { y: ["0%", "0%", "-7%", "0%", "-3%", "0%", "0%"] },
    times: [0, 0.45, 0.48, 0.51, 0.53, 0.55, 1],
  },
  // looks over at the verdict, then back to the code tile
  smith: {
    animate: { scaleX: [1, 1, -1, -1, 1, 1], y: ["0%", "0%", "-3%", "0%", "0%", "0%"] },
    times: [0, 0.56, 0.6, 0.72, 0.76, 1],
  },
};

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
  return (
    <>
      <ul className="contents">
        {AGENTS.map((a) => {
          const action = ACTIONS[a.id];
          return (
            <li key={a.id} className={a.mobile ? "contents" : "contents max-md:hidden"}>
              <motion.a
                href={a.href}
                className="group absolute block rounded-sm"
                style={{ left: px(a.x - a.frameW / 2), top: py(FOOT_Y - a.frameH), width: px(a.frameW), height: py(a.frameH) }}
                aria-label={`${a.name}: ${a.caption}`}
                whileHover={{ y: "-4%" }}
                whileFocus={{ y: "-4%" }}
                transition={{ type: "spring", bounce: 0.2, visualDuration: 0.25 }}
              >
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 block origin-bottom"
                  animate={action.animate}
                  transition={loop(action.times)}
                >
                  <span
                    className="agent-sprite absolute inset-0"
                    style={{
                      backgroundImage: `url(${a.sprite})`,
                      ["--blink" as string]: `${a.blink}s`,
                      ["--blink-delay" as string]: `${a.blinkDelay}s`,
                    }}
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
        transition={loop([0, 0.47, 0.5, 0.68, 0.72, 1])}
      >
        <PixelTick />
      </motion.span>
    </>
  );
}
