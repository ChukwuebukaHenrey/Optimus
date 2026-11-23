"use client";

import { ArrowCounterClockwise, CaretLeft, CaretRight, Pause, Play } from "@phosphor-icons/react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import type { EvidenceStory, RepairStory } from "@/lib/bundle";

type Step = EvidenceStory["steps"][number];
type Line = { who: "kane" | "optimus" | "agent"; text: string; tone?: "ok" | "bad" | "muted" };
type Frame = { title: string; shot: string | null; lines: Line[]; verdict?: "FAIL" | "PASS"; phase: "run" | "judge" | "repair" | "verify" };

/** Builds the replay entirely from recorded data: no step, value or verdict is invented. */
function buildFrames(e: EvidenceStory, r: RepairStory | null): Frame[] {
  const frames: Frame[] = [];
  const lines: Line[] = [];
  let lastShot: string | null = null;
  const stepLines = (s: Step) => {
    const out: Line[] = [{ who: "kane", text: `▶ ${s.action}` }];
    out.push({ who: "kane", text: s.recorded === null ? "  action: not established" : s.recorded ? "  action recorded" : "  action missing", tone: s.recorded ? "ok" : "bad" });
    for (const [k, v] of Object.entries(s.values)) out.push({ who: "kane", text: `  stored ${k} = ${v ?? "missing"}`, tone: "muted" });
    return out;
  };
  for (const s of e.steps) {
    lines.push(...stepLines(s));
    if (s.screenshot) lastShot = s.screenshot;
    frames.push({ title: `Kane · ${s.stepId}`, shot: lastShot, lines: [...lines], phase: "run" });
  }
  lines.push({ who: "optimus", text: `Optimus checks ${e.scenarioId} against the contract` });
  if (e.expected !== null) lines.push({ who: "optimus", text: `  expected ${e.expected}`, tone: "muted" });
  if (e.observed !== null) lines.push({ who: "optimus", text: `  observed ${e.observed}`, tone: "muted" });
  lines.push({ who: "optimus", text: `  ${e.verdict} — ${e.reason}`, tone: e.verdict === "PASS" ? "ok" : "bad" });
  frames.push({ title: "Optimus · verdict", shot: lastShot, lines: [...lines], verdict: e.verdict === "PASS" ? "PASS" : "FAIL", phase: "judge" });
  if (r) {
    const repairLines: Line[] = [
      { who: "optimus", text: "Verified FAIL → brief to the coding agent" },
      { who: "agent", text: `${r.agent ?? "coding agent"} edits ${r.changedFiles.join(", ")} (${r.diffStat.split("\n")[0].trim()})` },
      ...r.integrity.map((c) => ({ who: "optimus" as const, text: `  ${c.ok ? "✓" : "✗"} ${c.label}`, tone: c.ok ? ("ok" as const) : ("bad" as const) })),
    ];
    frames.push({ title: "Repair", shot: lastShot, lines: repairLines, phase: "repair" });
    const verify: Line[] = [{ who: "kane", text: "Fresh Kane run · same contract · new nonce" }];
    let verifyShot = lastShot;
    for (const s of r.verifiedSteps) {
      verify.push(...stepLines(s));
      if (s.screenshot) verifyShot = s.screenshot;
    }
    frames.push({ title: "Kane · fresh run", shot: verifyShot, lines: [...verify], phase: "verify" });
    frames.push({
      title: "Optimus · verdict",
      shot: verifyShot,
      lines: [...verify, { who: "optimus", text: `  ${r.latest} — ${r.outcome}`, tone: r.latest === "PASS" ? "ok" : "bad" }],
      verdict: r.latest === "PASS" ? "PASS" : "FAIL",
      phase: "verify",
    });
  }
  return frames;
}

const WHO = { kane: "text-[#9fd8ff]", optimus: "text-lime", agent: "text-[#ffc98a]" } as const;

export function RunReplay({ evidence, repair }: { evidence: EvidenceStory; repair: RepairStory | null }) {
  const frames = useMemo(() => buildFrames(evidence, repair), [evidence, repair]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!playing || !inView) return;
    const id = setTimeout(() => setI((n) => (n + 1) % frames.length), frames[i].verdict ? 3200 : 1900);
    return () => clearTimeout(id);
  }, [i, playing, inView, frames]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [i]);

  const f = frames[i];
  return (
    <div ref={ref} className="on-dark overflow-hidden rounded-sm border border-white/15 bg-azure-ink text-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 px-4 py-3">
        <p className="label-mono text-white/80">
          {evidence.buildLabel} · {evidence.scenarioName} ({evidence.scenarioId}) · recorded run
        </p>
        <div className="flex items-center gap-1">
          <button type="button" className="inline-flex size-11 items-center justify-center rounded-sm hover:bg-white/10" aria-label="Previous step" onClick={() => { setPlaying(false); setI((n) => (n - 1 + frames.length) % frames.length); }}>
            <CaretLeft aria-hidden="true" className="size-5" />
          </button>
          <button type="button" className="inline-flex size-11 items-center justify-center rounded-sm hover:bg-white/10" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause aria-hidden="true" className="size-5" /> : <Play aria-hidden="true" className="size-5" />}
          </button>
          <button type="button" className="inline-flex size-11 items-center justify-center rounded-sm hover:bg-white/10" aria-label="Next step" onClick={() => { setPlaying(false); setI((n) => (n + 1) % frames.length); }}>
            <CaretRight aria-hidden="true" className="size-5" />
          </button>
          <button type="button" className="inline-flex size-11 items-center justify-center rounded-sm hover:bg-white/10" aria-label="Replay from the start" onClick={() => { setI(0); setPlaying(true); }}>
            <ArrowCounterClockwise aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="border-b border-white/15 lg:border-r lg:border-b-0">
          <p className="flex items-center gap-2 border-b border-white/10 px-4 py-2 font-mono text-white/60">
            <span className="size-2 rounded-full bg-[#ff6b6b]" /> <span className="size-2 rounded-full bg-[#ffd166]" /> <span className="size-2 rounded-full bg-[#06d6a0]" />
            <span className="ml-2">kane-cli · optimus</span>
          </p>
          <ol ref={logRef} className="h-72 overflow-y-auto px-4 py-3 font-mono leading-6 lg:h-96" aria-live="polite">
            <AnimatePresence initial={false}>
              {f.lines.map((l, n) => (
                <motion.li
                  key={`${f.phase}-${n}-${l.text}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(0.4, n * 0.02) }}
                  className={cn("[overflow-wrap:anywhere]", l.tone === "ok" && "text-[#8ef0b0]", l.tone === "bad" && "text-[#ff9b8f]", l.tone === "muted" && "text-white/65", !l.tone && WHO[l.who])}
                >
                  <span className="text-white/40">{l.who === "kane" ? "kane" : l.who === "agent" ? "agent" : "optimus"} </span>
                  {l.text}
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        </div>

        <div className="relative flex flex-col">
          <p className="flex items-center gap-2 border-b border-white/10 px-4 py-2 font-mono text-white/60">
            <span className="truncate rounded-sm bg-white/10 px-2">browser · end-of-step screenshot</span>
          </p>
          <div className="relative aspect-[4/3] overflow-hidden bg-white">
            <AnimatePresence mode="popLayout" initial={false}>
              {f.shot && (
                <motion.img
                  key={f.shot}
                  src={`/report/${f.shot}`}
                  alt={`Screenshot: ${f.title}`}
                  className="absolute inset-0 w-full origin-[50%_0%] scale-[1.9]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {f.verdict && (
                <motion.div
                  key={`${f.phase}-${f.verdict}`}
                  className={cn(
                    "absolute right-4 bottom-4 rounded-sm px-4 py-2 font-mono text-[1.5rem] leading-8 font-extrabold",
                    f.verdict === "PASS" ? "bg-[var(--pass-bg)] text-[var(--pass-fg)]" : "border-l-4 border-[var(--fail-fg)] bg-[var(--fail-bg)] text-[var(--fail-fg)]",
                  )}
                  initial={{ opacity: 0, scale: 0.8, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", bounce: 0.35, visualDuration: 0.35 }}
                >
                  {f.verdict === "PASS" ? "✓ PASS" : "✗ FAIL"}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ol className="flex gap-1 border-t border-white/15 px-4 py-3" aria-label="Replay progress">
        {frames.map((fr, n) => (
          <li key={n} className="flex-1">
            <button
              type="button"
              onClick={() => { setPlaying(false); setI(n); }}
              aria-label={`Go to ${fr.title}`}
              aria-current={n === i ? "step" : undefined}
              className={cn("block h-2 w-full rounded-sm transition-colors", n <= i ? (fr.phase === "repair" ? "bg-[#ffc98a]" : fr.phase === "judge" || fr.verdict ? "bg-lime" : "bg-[#9fd8ff]") : "bg-white/15")}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
