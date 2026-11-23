"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { AGENTS, FOOT_Y, px, py, type AgentSpec } from "@/content/scene";

/**
 * The five agents and the hand-off, on one shared 10-second cycle.
 *
 * Every agent is ONE always-visible strip holding all its drawn frames (A-06: rest, blink, action,
 * turnaround, walk). A native Web Animation steps the strip with `step-end` timing, so each frame
 * cuts cleanly to the next; nothing fades, swaps images or waits for a hidden image to decode.
 * All animations (agents, spark, tick) get the same start time, so they never drift apart.
 * Nothing is flipped or nudged: every pose is a real drawn frame.
 *
 * Choreography: the standing agents walk in once on load. In the loop the spark leaves the
 * contract; each agent turns to watch it arrive, plays its action, then turns to watch it go on.
 * The smith repairs once the verdict is shown, then spins round. Blinks are part of the timeline.
 */
const CYCLE = 10; // seconds
const INTRO = 1.6; // walk-in, once per page load
const WALK_PX = 28; // how far (art px) each standing agent walks in from
const F = 0.12; // the default time per drawn frame

type Pose = "rest" | "blink" | `${"a" | "t" | "w"}${number}`;
type Cue = [at: number, pose: Pose];

/** Poses played one after another from `at`; the agent returns to rest afterwards. */
function seq(at: number, steps: [Pose, number][]): Cue[] {
  const cues: Cue[] = [];
  let t = at;
  for (const [pose, d] of steps) {
    cues.push([t, pose]);
    t += d;
  }
  cues.push([t, "rest"]);
  return cues;
}
const blinkAt = (at: number) => seq(at, [["blink", F]]);
type Steps = [Pose, number][];
/** Turn to the left (toward the agent sending the hand-off), hold, turn back. */
const lookLeft = (hold: number): Steps => [["t7", F], ["t6", hold], ["t7", F]];
/** Turn to the right (toward the next agent), hold, turn back. */
const lookRight = (hold: number): Steps => [["t1", F], ["t2", hold], ["t1", F]];

/** The hand-off spark: where it is (by agent) and when, in seconds. */
const SPARK = {
  contract: { show: 0.55, leave: 0.7 },
  runner: { arrive: 1.75, leave: 2.9 },
  evidence: { arrive: 3.3, leave: 4.55 },
  verdict: { arrive: 4.95, fade: 5.15 },
};
const TICK = { show: 5.6, hide: 6.9 }; // the floating tick, while the verdict shows its clipboard

// Each agent's watch → act → watch is ONE chained sequence, so moves join without a rest flash.
const CHOREO: Record<AgentSpec["id"], Cue[]> = {
  // picks the scroll up from the post and holds it out as the spark leaves (its turnaround and
  // walk rows don't hold the scroll, so it doesn't glance around)
  contract: [
    ...seq(0, [["a1", F], ["a2", F], ["a3", F], ["a4", 0.14], ["a5", 0.5], ["a6", F], ["a7", F]]),
    ...blinkAt(4.2),
    ...blinkAt(8.1),
  ],
  // watches the spark come in, opens the laptop, types, looks up, watches it go on
  runner: [
    ...seq(1.2, [
      ...lookLeft(0.45),
      ["a1", F], ["a2", F], ["a3", 0.1], ["a4", 0.1], ["a3", 0.1], ["a4", 0.1], ["a5", 0.1], ["a6", 0.35], ["a7", F],
      ...lookRight(0.9),
    ]),
    ...blinkAt(6.6),
    ...blinkAt(9.2),
  ],
  // steps in, kneels for the picture frame, inspects it with a glint, stands
  evidence: [
    ...blinkAt(0.9),
    ...seq(2.75, [
      ...lookLeft(0.4),
      ["a1", F], ["a2", 0.3], ["a3", 0.15], ["a4", 0.15], ["a5", 0.4], ["a6", 0.15], ["a7", F],
      ...lookRight(0.75),
    ]),
    ...blinkAt(8.4),
  ],
  // writes the tick stroke by stroke, shows the clipboard, watches the smith
  verdict: [
    ...blinkAt(1.5),
    ...seq(4.25, [
      ...lookLeft(0.45),
      ["a1", F], ["a2", F], ["a3", 0.15], ["a4", 0.2], ["a5", 0.35], ["a6", 0.6], ["a7", F],
      ...lookRight(0.7),
    ]),
    ...blinkAt(9.0),
  ],
  // looks at the verdict, sets the { } tile and taps it in, pauses, then spins round once
  smith: [
    ...blinkAt(2.0),
    ...blinkAt(4.6),
    ...seq(6.0, [...lookLeft(0.5), ["a1", F], ["a2", 0.15], ["a3", 0.15], ["a4", 0.2], ["a5", 0.3], ["a6", 0.25], ["a7", F]]),
    ...seq(8.2, [["t1", 0.1], ["t2", 0.1], ["t3", 0.1], ["t4", 0.1], ["t5", 0.1], ["t6", 0.1], ["t7", 0.1], ["t0", 0.15]]),
  ],
};

function frameOf(a: AgentSpec, pose: Pose): number {
  if (pose === "rest") return a.frames.rest;
  if (pose === "blink") return a.frames.blink;
  const row = { a: a.frames.action, t: a.frames.turn, w: a.frames.walk }[pose[0] as "a" | "t" | "w"];
  const i = row?.[Number(pose.slice(1))];
  if (i === undefined) throw new Error(`${a.id} has no frame ${pose}`);
  return i;
}
const shift = (a: AgentSpec, frame: number) => `translateX(${(-frame / a.count) * 100}%)`;

/** Cues → keyframes that hold each frame until the next cue (step-end: a clean cut). */
function frameKeyframes(a: AgentSpec, cues: Cue[], duration: number): Keyframe[] {
  const EPS = 1e-6;
  // Sum of frame times can overshoot by a float hair (16 × 0.1 = 1.6000000000000003): clamp.
  const sorted = cues.map(([t, pose]): Cue => [Math.min(Math.max(t, 0), duration), pose]).sort((x, y) => x[0] - y[0]);
  // Where one sequence's trailing "rest" meets the next sequence's first frame, keep the frame.
  const merged: Cue[] = [];
  for (const cue of sorted) {
    const prev = merged[merged.length - 1];
    if (prev && Math.abs(prev[0] - cue[0]) < EPS) {
      if (cue[1] !== "rest") merged[merged.length - 1] = [prev[0], cue[1]];
      continue;
    }
    merged.push(cue);
  }
  if (!merged.length || merged[0][0] > EPS) merged.unshift([0, "rest"]);
  const kf: Keyframe[] = merged
    .filter(([t]) => t < duration - EPS)
    .map(([t, pose]) => ({ offset: t / duration, transform: shift(a, frameOf(a, pose)), easing: "step-end" }));
  const last = merged[merged.length - 1];
  kf.push({ offset: 1, transform: shift(a, frameOf(a, last[1])) });
  return kf;
}

/** The walk-in: two walk cycles while sliding into place. */
function introCues(a: AgentSpec): Cue[] {
  if (!a.frames.walk) return [];
  const steps: [Pose, number][] = [];
  const per = INTRO / 16;
  for (let i = 0; i < 16; i++) steps.push([`w${i % 8}`, per]);
  return seq(0, steps);
}

function sparkKeyframes(): Keyframe[] {
  const at = (id: keyof typeof SPARK) => AGENTS.find((a) => a.id === id)!.prop!;
  const pos = (p: { x: number; y: number }) => `translate(${px(p.x)}, ${py(p.y)})`;
  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 16 });
  const [c, r, e, v] = [at("contract"), at("runner"), at("evidence"), at("verdict")];
  const k = (t: number, p: { x: number; y: number }, opacity: number): Keyframe => ({ offset: t / CYCLE, transform: pos(p), opacity });
  return [
    k(0, c, 0),
    k(SPARK.contract.show - 0.05, c, 0),
    k(SPARK.contract.show, c, 1),
    k(SPARK.contract.leave, c, 1),
    k((SPARK.contract.leave + SPARK.runner.arrive) / 2, mid(c, r), 1),
    k(SPARK.runner.arrive, r, 1),
    k(SPARK.runner.leave, r, 1),
    k((SPARK.runner.leave + SPARK.evidence.arrive) / 2, mid(r, e), 1),
    k(SPARK.evidence.arrive, e, 1),
    k(SPARK.evidence.leave, e, 1),
    k((SPARK.evidence.leave + SPARK.verdict.arrive) / 2, mid(e, v), 1),
    k(SPARK.verdict.arrive, v, 1),
    k(SPARK.verdict.fade, v, 0),
    k(CYCLE, v, 0),
  ];
}

function tickKeyframes(): Keyframe[] {
  const k = (t: number, y: string, opacity: number): Keyframe => ({ offset: t / CYCLE, transform: `translateY(${y})`, opacity });
  return [k(0, "40%", 0), k(TICK.show, "40%", 0), k(TICK.show + 0.3, "0%", 1), k(TICK.hide - 0.4, "0%", 1), k(TICK.hide, "-40%", 0), k(CYCLE, "-40%", 0)];
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
  const strips = useRef<(HTMLSpanElement | null)[]>([]);
  const walkers = useRef<(HTMLSpanElement | null)[]>([]);
  const spark = useRef<HTMLSpanElement>(null);
  const tick = useRef<HTMLSpanElement>(null);
  const verdict = AGENTS.find((a) => a.id === "verdict")!;

  useEffect(() => {
    // Reduced motion (or no Web Animations): the agents keep their rest pose.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof Element.prototype.animate !== "function") return;

    const running: Animation[] = [];
    // fill "none": while the loop waits out the walk-in, the walk-in frames (fill "forwards") show.
    const loop: KeyframeAnimationOptions = { duration: CYCLE * 1000, iterations: Infinity, delay: INTRO * 1000 };

    try {
      AGENTS.forEach((a, i) => {
        const strip = strips.current[i];
        const walker = walkers.current[i];
        if (!strip || !walker) return;
        const intro = introCues(a);
        if (intro.length) {
          running.push(strip.animate(frameKeyframes(a, intro, INTRO), { duration: INTRO * 1000, fill: "forwards" }));
          running.push(walker.animate([{ transform: `translateX(${(-WALK_PX / a.frameW) * 100}%)` }, { transform: "translateX(0)" }], { duration: INTRO * 1000, easing: "linear", fill: "backwards" }));
        }
        running.push(strip.animate(frameKeyframes(a, CHOREO[a.id], CYCLE), loop));
      });
      if (spark.current) running.push(spark.current.animate(sparkKeyframes(), { ...loop, easing: "linear" }));
      if (tick.current) running.push(tick.current.animate(tickKeyframes(), { ...loop, easing: "linear" }));
    } catch (error) {
      // Decoration must never break the page: on any failure the agents simply stand still.
      running.forEach((anim) => anim.cancel());
      console.error("Hero animation disabled:", error);
      return;
    }

    // One clock for everything: the same start time on every animation.
    const start = document.timeline.currentTime;
    for (const anim of running) anim.startTime = start;
    return () => running.forEach((anim) => anim.cancel());
  }, []);

  return (
    <>
      <ul className="contents">
        {AGENTS.map((a, i) => (
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
              <span
                aria-hidden="true"
                ref={(el) => {
                  walkers.current[i] = el;
                }}
                className="absolute inset-0 block overflow-hidden"
              >
                <span
                  ref={(el) => {
                    strips.current[i] = el;
                  }}
                  className="agent-strip absolute inset-y-0 left-0 block"
                  style={{ width: `${a.count * 100}%`, backgroundImage: `url(${a.sheet})` }}
                />
              </span>
              <span
                aria-hidden="true"
                className="glass pointer-events-none absolute bottom-full left-1/2 mb-2 w-max max-w-56 -translate-x-1/2 rounded-sm px-3 py-2 text-left text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <span className="block font-extrabold">{a.name}</span>
                <span className="block">{a.caption}</span>
              </span>
            </motion.a>
          </li>
        ))}
      </ul>

      <span ref={spark} aria-hidden="true" className="handoff-track">
        <span className="handoff" />
      </span>
      <span
        ref={tick}
        aria-hidden="true"
        className="handoff-tick"
        style={{ left: px(verdict.x - 4), top: py(FOOT_Y - verdict.frameH - 14), width: px(8), height: py(7) }}
      >
        <PixelTick />
      </span>
    </>
  );
}
