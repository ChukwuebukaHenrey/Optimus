/** Scene 3 · How it works: the contract → what Kane is told → four steps → three verdicts. */
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, MOTION, PIXEL_ART, SHOTS, type Scene } from "../config";
import { Captions, Chip, Shot, SkyBackdrop, useEntrance, VerdictBadge } from "../components/kit";
import { fontStack } from "../fonts";
import { rec } from "./shots";

const STEPS = [
  { art: PIXEL_ART.editorialContract, title: "One contract", sub: "what to do, what to record" },
  { art: PIXEL_ART.editorialEvidence, title: "Kane records", sub: "real browser, never told the answer" },
  { art: PIXEL_ART.editorialVerdicts, title: "Optimus judges", sub: "deterministic checks, no AI" },
  { art: PIXEL_ART.editorialRepair, title: "Controlled repair", sub: "only a verified failure" },
] as const;

export const Scene3: React.FC<{ readonly scene: Scene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const sh = SHOTS["3"];
  return (
    <AbsoluteFill>
      <SkyBackdrop />
      <Sequence name="Contract (R4)" durationInFrames={(sh.contract.to - sh.contract.from) * fps}>
        <Shot {...rec(sh.contract.rec, sh.contract.trim)} frame={sh.contract.frame} />
        <Chip>{sh.contract.label}</Chip>
      </Sequence>
      <Sequence name="_test.md (R4)" from={sh.testMd.from * fps} durationInFrames={(sh.testMd.to - sh.testMd.from) * fps}>
        <Shot {...rec(sh.testMd.rec, sh.testMd.trim)} frame={sh.testMd.frame} />
        <Chip>{sh.testMd.label}</Chip>
        <Callout at={Math.round(0.8 * fps)}>{sh.testMd.callout}</Callout>
      </Sequence>
      <Sequence name="Four steps" from={sh.cardsFrom * fps}>
        <Steps verdictsAt={(sh.verdictsAt - sh.cardsFrom) * fps} />
      </Sequence>
      <Captions lines={scene.lines} />
    </AbsoluteFill>
  );
};

const Callout: React.FC<{ readonly at: number; readonly children: React.ReactNode }> = ({ at, children }) => {
  const enter = useEntrance(at);
  return (
    <div
      style={{
        position: "absolute",
        right: 200,
        top: 200,
        padding: "14px 26px",
        borderRadius: 12,
        backgroundColor: COLORS.lime,
        color: COLORS.ink,
        fontFamily: fontStack.display,
        fontWeight: 800,
        fontSize: 44,
        boxShadow: "0 16px 40px rgb(6 33 61 / 0.45)",
        opacity: enter,
        scale: interpolate(enter, [0, 1], [0.85, 1]),
        rotate: "-2deg",
      }}
    >
      {children}
    </div>
  );
};

const CARD_W = 380;
const GAP = 40;

const Steps: React.FC<{ readonly verdictsAt: number }> = ({ verdictsAt }) => {
  const total = STEPS.length * CARD_W + (STEPS.length - 1) * GAP;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 150, left: (1920 - total) / 2, display: "flex", gap: GAP }}>
        {STEPS.map((st, i) => (
          <StepCard key={st.title} step={st} at={i * MOTION.stagger * 3} />
        ))}
      </div>
      <div style={{ position: "absolute", top: 640, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 40 }}>
        <VerdictBadge verdict="PASS" size={44} at={verdictsAt} />
        <VerdictBadge verdict="FAIL" size={44} at={verdictsAt + MOTION.stagger} />
        <VerdictBadge verdict="INCONCLUSIVE" size={44} at={verdictsAt + MOTION.stagger * 2} glow />
      </div>
    </AbsoluteFill>
  );
};

const StepCard: React.FC<{ readonly step: (typeof STEPS)[number]; readonly at: number }> = ({ step, at }) => {
  const frame = useCurrentFrame();
  const enter = useEntrance(at);
  const tick = interpolate(frame - at - MOTION.entrance - MOTION.tickAfterSettle, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        width: CARD_W,
        borderRadius: 14,
        padding: 20,
        backgroundColor: "rgb(245 245 242 / 0.95)",
        boxShadow: "0 20px 50px rgb(6 33 61 / 0.5)",
        color: COLORS.ink,
        opacity: interpolate(enter, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
        translate: `0px ${(1 - enter) * 60}px`,
        position: "relative",
      }}
    >
      {/* Editorial pixel art at its native size (×1): no smoothing. */}
      <Img
        src={staticFile(step.art.file)}
        style={{ width: step.art.width, height: step.art.height, imageRendering: "pixelated", display: "block", margin: "0 auto", borderRadius: 6 }}
      />
      <div style={{ fontFamily: fontStack.display, fontWeight: 800, fontSize: 36, marginTop: 16 }}>{step.title}</div>
      <div style={{ fontFamily: fontStack.body, fontSize: 24, color: COLORS.charcoal, marginTop: 6 }}>{step.sub}</div>
      <div
        style={{
          position: "absolute",
          right: -14,
          top: -14,
          width: 52,
          height: 52,
          borderRadius: 99,
          backgroundColor: COLORS.lime,
          color: COLORS.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          fontWeight: 800,
          opacity: tick,
          scale: interpolate(tick, [0, 1], [0.4, 1]),
          boxShadow: "0 6px 16px rgb(6 33 61 / 0.4)",
        }}
      >
        ✓
      </div>
    </div>
  );
};
