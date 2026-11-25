/** Scene 4 · The live repair of build U, from the real R1–R3 recordings and Kane's own screenshots. */
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, DERIVED, FACTS, MOTION, SHOTS, type Scene } from "../config";
import { Captions, Chip, Shot, SkyBackdrop, VerdictBadge } from "../components/kit";
import { derived, freeze, rec, still } from "./shots";

const LIVE = FACTS.liveRun;
const red = COLORS.verdict.FAIL.glow;
const lime = COLORS.verdict.PASS.glow;

/** Elapsed real time of a time-lapse, read from the real source span (never invented). */
const ElapsedChip: React.FC<{
  readonly id: "r1Baseline" | "r1Verify";
  readonly runStart: number;
  readonly label: string;
  readonly done: string;
}> = ({ id, runStart, label, done }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = DERIVED[id];
  const sourceT = d.start + (frame / fps) * ((d.end - d.start) / d.seconds);
  const minutes = Math.max(0, (Math.min(sourceT, d.end) - runStart) / 60);
  const finished = frame >= d.seconds * fps - 2;
  return (
    <Chip dot={COLORS.azure}>
      {label} · time-lapse · {finished ? done : `${minutes.toFixed(1)} min`}
    </Chip>
  );
};

export const Scene4a: React.FC<{ readonly scene: Scene }> = ({ scene }) => {
  const sh = SHOTS["4a"].intro;
  return (
    <AbsoluteFill>
      <SkyBackdrop />
      <Shot {...derived(sh.derived)} frame={sh.frame} />
      <Chip>{sh.label}</Chip>
      <Captions lines={scene.lines} />
    </AbsoluteFill>
  );
};

export const Scene4b: React.FC<{ readonly scene: Scene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const sh = SHOTS["4b"];
  return (
    <AbsoluteFill>
      <SkyBackdrop />
      <Sequence name="Baseline time-lapse" durationInFrames={sh.timelapse.to * fps}>
        <Shot {...derived(sh.timelapse.derived)} frame={sh.timelapse.frame} />
        {/* R1: Kane run-0 started at 21.5 s into the recording. */}
        <ElapsedChip id="r1Baseline" runStart={21.5} label="Baseline Kane run" done={`${LIVE.baseline.minutes} min · ${LIVE.baseline.credits} credits`} />
      </Sequence>
      <Sequence name="Verified FAIL" from={sh.fail.from * fps} durationInFrames={(sh.fail.to - sh.fail.from) * fps}>
        <Shot {...freeze(sh.fail.freeze)} frame={sh.fail.frame} focus={sh.fail.focus} focusAt={Math.round(sh.fail.focusAt * fps)} glow={{ rect: sh.fail.glow, color: red }} />
        <Chip dot={red}>Optimus's verdicts for the baseline run · live</Chip>
      </Sequence>
      <Sequence name="Kane's screenshot" from={sh.kaneShot.from * fps}>
        <Shot {...still(sh.kaneShot.still)} focus={sh.kaneShot.focus} focusAt={Math.round(0.2 * fps)}>
          <div style={{ position: "absolute", right: 40, top: 36 }}>
            <VerdictBadge verdict="FAIL" size={52} glow prefix="Optimus · L4" at={Math.round(0.4 * fps)} />
          </div>
        </Shot>
        <Chip dot={red}>{sh.kaneShot.label}</Chip>
      </Sequence>
      <Captions lines={scene.lines} />
    </AbsoluteFill>
  );
};

export const Scene4c: React.FC<{ readonly scene: Scene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const sh = SHOTS["4c"].brief;
  return (
    <AbsoluteFill>
      <SkyBackdrop />
      <Shot {...rec("R2", sh.trim)} frame={sh.frame} focus={sh.focus} focusAt={sh.focusAt * fps} glow={{ rect: sh.glow, color: red }} />
      <Chip>{sh.label}</Chip>
      <Captions lines={scene.lines} />
    </AbsoluteFill>
  );
};

export const Scene4d: React.FC<{ readonly scene: Scene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const sh = SHOTS["4d"].diff;
  return (
    <AbsoluteFill>
      <SkyBackdrop />
      <Shot {...freeze(sh.freeze)} frame={sh.frame} focus={sh.focus} focusAt={sh.focusAt * fps} glow={{ rect: sh.glow, color: lime }} />
      <Chip>{sh.label}</Chip>
      <Captions lines={scene.lines} />
    </AbsoluteFill>
  );
};

export const Scene4e: React.FC<{ readonly scene: Scene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const sh = SHOTS["4e"].integrity;
  return (
    <AbsoluteFill>
      <SkyBackdrop />
      <Shot {...freeze(sh.freeze)} frame={sh.frame} focus={sh.focus} focusAt={sh.focusAt * fps} glow={{ rect: sh.glow, color: lime }} />
      <Chip>{sh.label}</Chip>
      <Captions lines={scene.lines} mode="stack" />
    </AbsoluteFill>
  );
};

export const Scene4f: React.FC<{ readonly scene: Scene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const sh = SHOTS["4f"];
  const v = LIVE.verification.verdicts;
  return (
    <AbsoluteFill>
      <SkyBackdrop />
      <Sequence name="Fresh run time-lapse" durationInFrames={sh.timelapse.to * fps}>
        <Shot {...derived(sh.timelapse.derived)} frame={sh.timelapse.frame} />
        {/* R1: Kane run-1 started at 673.5 s into the recording. */}
        <ElapsedChip id="r1Verify" runStart={673.5} label="Fresh Kane run" done={`${LIVE.verification.minutes.toFixed(1)} min · ${LIVE.verification.credits.toFixed(2)} credits`} />
      </Sequence>
      <Sequence name="Kane's screenshot, fresh run" from={sh.kaneShot.from * fps} durationInFrames={(sh.kaneShot.to - sh.kaneShot.from) * fps}>
        <Shot {...still(sh.kaneShot.still)} focus={sh.kaneShot.focus} focusAt={Math.round(0.2 * fps)} />
        <Chip>{sh.kaneShot.label}</Chip>
      </Sequence>
      <Sequence name="Optimus PASS" from={sh.pass.from * fps}>
        <Shot {...freeze(sh.pass.freeze)} frame={sh.pass.frame} focus={sh.pass.focus} focusAt={Math.round(sh.pass.focusAt * fps)} glow={{ rect: sh.pass.glow, color: lime }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, display: "flex", justifyContent: "center", gap: 28 }}>
            {(Object.keys(v) as Array<keyof typeof v>).map((k, i) => (
              <VerdictBadge key={k} verdict={v[k]} size={46} prefix={k} glow at={Math.round(sh.pass.focusAt * fps) + MOTION.punchIn + i * MOTION.stagger} />
            ))}
          </div>
        </Shot>
        <Chip dot={lime}>Optimus's verdicts for the fresh run · live</Chip>
      </Sequence>
      <Captions lines={scene.lines} />
    </AbsoluteFill>
  );
};

