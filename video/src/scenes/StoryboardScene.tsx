/**
 * Storyboard placeholder for one scene: shows the scene's function, picture notes and its approved
 * on-screen lines at their configured times, so timing can be reviewed in the Studio before the real
 * scene is built. Clearly labelled; never presented as the final picture.
 */
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, copy, FOOTAGE, LAYOUT, MOTION, type Line, type Scene } from "../config";
import { fontStack } from "../fonts";

const ease = (b: readonly number[]) => Easing.bezier(b[0], b[1], b[2], b[3]);

const OnScreenLine: React.FC<{ readonly line: Line }> = ({ line }) => {
  const frame = useCurrentFrame();
  const t = frame - line.at;
  return (
    <div
      style={{
        fontFamily: fontStack.display,
        fontWeight: 700,
        fontSize: 64,
        lineHeight: 1.15,
        color: COLORS.white,
        background: LAYOUT.scrim,
        padding: "14px 28px",
        borderRadius: 8,
        opacity: interpolate(t, [0, MOTION.entrance * 0.6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        translate: interpolate(t, [0, MOTION.entrance], ["0px 24px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: ease(MOTION.easing.entrance),
        }),
      }}
    >
      {copy(line.text)}
    </div>
  );
};

const Timecode: React.FC<{ readonly from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = from + frame;
  const sec = Math.floor(total / fps);
  const mm = String(Math.floor(sec / 60));
  const ss = String(sec % 60).padStart(2, "0");
  return (
    <span>
      {mm}:{ss} · frame {total}
    </span>
  );
};

export const StoryboardScene: React.FC<{ readonly scene: Scene; readonly from: number }> = ({ scene, from }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.sky} 0%, ${COLORS.deep} 100%)`,
        fontFamily: fontStack.body,
        color: COLORS.white,
      }}
    >
      {/* Header: what this scene is (inside the title-safe area) */}
      <div style={{ position: "absolute", left: 96, top: 72, right: 96, display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: fontStack.mono, fontSize: 24, opacity: 0.8 }}>
            STORYBOARD PLACEHOLDER · scene {scene.id} · {(scene.frames / fps).toFixed(1)} s
            {scene.needsApproval ? " · needs approval" : ""}
          </div>
          <div style={{ fontFamily: fontStack.display, fontSize: 56, fontWeight: 800, marginTop: 8 }}>
            {scene.name} <span style={{ fontWeight: 300 }}>— {scene.storyFunction}</span>
          </div>
        </div>
        <div style={{ fontFamily: fontStack.mono, fontSize: 24, opacity: 0.8, textAlign: "right" }}>
          <Timecode from={from} />
          <div>footage: {FOOTAGE}</div>
        </div>
      </div>

      {/* Picture notes: where the recording / motion will go */}
      <div
        style={{
          position: "absolute",
          left: (1920 - LAYOUT.recordingFrame.width * 0.6) / 2,
          top: 240,
          width: LAYOUT.recordingFrame.width * 0.6,
          // Short enough that three stacked lines (bottom area) never overlap it.
          height: 360,
          border: `3px dashed rgb(255 255 255 / 0.5)`,
          borderRadius: LAYOUT.recordingFrame.radius,
          padding: 32,
          fontSize: 30,
          lineHeight: 1.35,
          opacity: 0.9,
        }}
      >
        <div style={{ fontFamily: fontStack.mono, fontSize: 22, opacity: 0.7, marginBottom: 12 }}>
          PICTURE{scene.recordings.length ? ` · ${scene.recordings.join(", ")}` : ""}
        </div>
        {scene.picture}
      </div>

      {/* Approved on-screen copy at its configured times */}
      <div
        style={{
          position: "absolute",
          left: 96,
          right: 96,
          bottom: 72,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        {scene.lines.map((line) => (
          <LineGate key={line.id} line={line} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Mounts a line only from its start frame, so later lines don't reserve space early. */
const LineGate: React.FC<{ readonly line: Line }> = ({ line }) => {
  const frame = useCurrentFrame();
  return frame >= line.at ? <OnScreenLine line={line} /> : null;
};
