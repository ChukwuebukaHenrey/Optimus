/**
 * Scene 5 · Proof: three pages, each with its own part of the voiceover and its number counting up
 * beside the recording of its source (24/24 → 11 → 2). The tests page and the report follow in scene 6.
 */
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { COLORS, FACTS, SHOTS, type Scene } from "../config";
import { Captions, CountUp, Shot, SkyBackdrop, useEntrance } from "../components/kit";
import { fontStack } from "../fonts";
import { freeze, rec } from "./shots";

const BOX = { w: 1180, h: 700, left: 96, top: 150 };
const lime = COLORS.verdict.PASS.glow;

export const Scene5: React.FC<{ readonly scene: Scene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const sh = SHOTS["5"];
  const seg = (s: { from: number; to: number }) => ({ from: Math.round(s.from * fps), durationInFrames: Math.round((s.to - s.from) * fps) });
  const cal = sh.calibration;
  const green = sh.greenBroken;
  return (
    <AbsoluteFill>
      <SkyBackdrop />
      <Sequence name="24/24 calibrated" {...seg(cal)}>
        <Shot {...freeze(cal.freeze)} frame={cal.frame} focus={cal.focus} focusAt={Math.round(cal.focusAt * fps)} glow={{ rect: cal.glow, color: lime }} box={BOX} />
        <Stat
          at={Math.round(cal.statAt * fps)}
          big={<><CountUp to={FACTS.calibrationGate1.matched} at={Math.round(cal.statAt * fps)} />/{FACTS.calibrationGate1.total}</>}
          label="cases matched the expected verdict"
          source={cal.source}
        />
      </Sequence>
      <Sequence name="11 of 97" {...seg(green)}>
        <Shot {...freeze(green.freeze)} frame={green.frame} focus={green.focus} focusAt={Math.round(green.focusAt * fps)} glow={{ rect: green.glow, color: lime }} box={BOX} />
        <Stat
          at={Math.round(green.statAt * fps)}
          big={<CountUp to={FACTS.greenOnBroken.caught} at={Math.round(green.statAt * fps)} />}
          label={`green Kane runs on a broken build, of ${FACTS.greenOnBroken.archivedRuns} archived runs — each caught by Optimus`}
          source={green.source}
        />
      </Sequence>
      <Sequence name="#252" {...seg(sh.issues252)}>
        <Shot {...rec(sh.issues252.rec, sh.issues252.trim)} frame={sh.issues252.frame} box={BOX} />
      </Sequence>
      <Sequence name="#253" {...seg(sh.issues253)}>
        <Shot {...rec(sh.issues253.rec, sh.issues253.trim)} frame={sh.issues253.frame} box={BOX} />
      </Sequence>
      <Sequence name="Kane issues stat" from={Math.round(sh.issues252.from * fps)} durationInFrames={Math.round((sh.issues253.to - sh.issues252.from) * fps)}>
        <Stat
          at={Math.round(sh.issues252.statAt * fps)}
          big={<CountUp to={FACTS.kaneIssues.numbers.length} at={Math.round(sh.issues252.statAt * fps)} />}
          label={`Kane CLI bugs reported: ${FACTS.kaneIssues.numbers.map((n) => `#${n}`).join(", ")}`}
          source="github.com/LambdaTest/kane-cli/issues"
        />
      </Sequence>
      <Captions lines={scene.lines} />
    </AbsoluteFill>
  );
};

const Stat: React.FC<{ readonly at: number; readonly big: React.ReactNode; readonly label: string; readonly source: string }> = ({ at, big, label, source }) => {
  const enter = useEntrance(at);
  return (
    <div
      style={{
        position: "absolute",
        left: BOX.left + BOX.w + 48,
        right: 96,
        top: BOX.top + 40,
        color: COLORS.white,
        opacity: enter,
        translate: `${(1 - enter) * 40}px 0px`,
      }}
    >
      <div style={{ fontFamily: fontStack.display, fontWeight: 800, fontSize: 150, lineHeight: 1, color: COLORS.lime }}>{big}</div>
      <div style={{ fontFamily: fontStack.body, fontSize: 34, lineHeight: 1.3, marginTop: 20 }}>{label}</div>
      <div style={{ fontFamily: fontStack.mono, fontSize: 22, marginTop: 28, opacity: 0.85, padding: "8px 14px", borderRadius: 8, backgroundColor: "rgb(6 33 61 / 0.7)", display: "inline-block" }}>
        source: {source}
      </div>
    </div>
  );
};
