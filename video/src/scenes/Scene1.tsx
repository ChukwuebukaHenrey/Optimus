/** Scene 1 · Hook: Kane's own green "passed" → the same run's screenshot → Optimus's FAIL. */
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { COLORS, copy, SHOTS, type Scene } from "../config";
import { Captions, Chip, Shot, SkyBackdrop, VerdictBadge } from "../components/kit";
import { fontStack } from "../fonts";
import { freeze, still } from "./shots";

export const Scene1: React.FC<{ readonly scene: Scene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const sh = SHOTS["1"];
  const label = scene.lines.find((l) => l.id === "archived-label");
  return (
    <AbsoluteFill>
      <SkyBackdrop />
      <Sequence name="Kane: passed" durationInFrames={sh.passed.to * fps}>
        <Shot
          {...freeze(sh.passed.freeze)}
          frame={sh.passed.frame}
          focus={sh.passed.focus}
          focusAt={0.3 * fps}
          glow={{ rect: sh.passed.glow, color: COLORS.azure }}
        />
        <Chip>Kane CLI's own result · archived run, build U · stdout.ndjson line 141</Chip>
      </Sequence>
      <Sequence name="The app: broken" from={sh.broken.from * fps}>
        <Shot {...still(sh.broken.still)} focus={sh.broken.focus} focusAt={Math.round(0.4 * fps)}>
          <div style={{ position: "absolute", right: 40, top: 36, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
            <VerdictBadge verdict="FAIL" size={64} glow at={(sh.failBadgeAt - sh.broken.from) * fps} />
            <OptimusLabel at={(sh.failBadgeAt - sh.broken.from) * fps} />
          </div>
        </Shot>
        {label ? <Chip dot={COLORS.verdict.FAIL.glow}>{copy(label.text)}</Chip> : null}
        <Chip at={Math.round(0.5 * fps)} dot={COLORS.azure} style={{ top: 112 }}>{sh.testLabel}</Chip>
      </Sequence>
      <Captions lines={scene.lines} mode="stack" exclude={["archived-label"]} />
    </AbsoluteFill>
  );
};

const OptimusLabel: React.FC<{ readonly at: number }> = ({ at }) => (
  <Sequence from={at} layout="none">
    <div style={{ fontFamily: fontStack.mono, fontSize: 24, color: COLORS.ink, backgroundColor: "rgb(255 255 255 / 0.9)", padding: "4px 12px", borderRadius: 6 }}>
      Optimus's verdict on Kane's evidence
    </div>
  </Sequence>
);
