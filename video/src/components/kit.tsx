/**
 * Shared building blocks for the scenes. Every value that may change lives in src/config.ts.
 * Pixel art: whole-number scales, nearest-neighbour only. Recordings: proportional, never stretched.
 */
import { Video } from "@remotion/media";
import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, copy, LAYOUT, MOTION, PIXEL_ART, type Line, type Rect } from "../config";
import { fontStack } from "../fonts";

export const ease = (b: readonly number[]) => Easing.bezier(b[0], b[1], b[2], b[3]);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0→1 entrance progress with the brand overshoot, starting at `at` frames. */
export const useEntrance = (at = 0, duration: number = MOTION.entrance) => {
  const frame = useCurrentFrame();
  return interpolate(frame - at, [0, duration], [0, 1], { ...clamp, easing: ease(MOTION.easing.entrance) });
};

// ---------------------------------------------------------------------------------------------
// Backdrops
// ---------------------------------------------------------------------------------------------

/** The hero plate, ×3 = exactly 1920×1080, dimmed so recordings stand out. */
export const SkyBackdrop: React.FC<{ readonly dim?: number }> = ({ dim = 0.62 }) => {
  const p = PIXEL_ART.heroPlate;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.sky }}>
      <Img
        src={staticFile(p.file)}
        style={{ width: p.width * p.scale, height: p.height * p.scale, imageRendering: "pixelated" }}
      />
      <AbsoluteFill
        style={{ background: `linear-gradient(180deg, rgb(6 33 61 / ${dim * 0.8}) 0%, rgb(6 33 61 / ${dim}) 100%)` }}
      />
    </AbsoluteFill>
  );
};

/** The dusk plate ×4 (1920×760) on the bottom, its own sky colour extended above, stars twinkling. */
export const DuskBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = PIXEL_ART.duskPlate;
  const h = p.height * p.scale;
  const star = 1 + (Math.floor(frame / (fps * 0.5)) % 3);
  const img = { position: "absolute", left: 0, bottom: 0, width: p.width * p.scale, height: h, imageRendering: "pixelated" } as const;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #0B1E4F 0%, #1D4AAC 29.6%)" }}>
      <Img src={staticFile(p.file)} style={img} />
      <Img src={staticFile(`art/dusk/stars-${star}.png`)} style={img} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgb(6 33 61 / 0.15), rgb(6 33 61 / 0.55))" }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// Shot: a real recording (video or freeze frame) in the brand frame, with an optional slow punch-in
// to one region and a glow on the line that matters.
// ---------------------------------------------------------------------------------------------

type Media = { readonly video: string; readonly trimBefore?: number } | { readonly image: string; readonly pixelated?: boolean };

/** Grow `r` around its centre to the aspect `a`, then keep it inside the source. */
const toAspect = (r: Rect, a: number, src: { w: number; h: number }): Rect => {
  let { w, h } = r;
  if (w / h > a) h = w / a;
  else w = h * a;
  w = Math.min(w, src.w);
  h = Math.min(h, src.h);
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const x = Math.min(Math.max(cx - w / 2, 0), src.w - w);
  const y = Math.min(Math.max(cy - h / 2, 0), src.h - h);
  return { x, y, w, h };
};

export type ShotProps = {
  readonly media: Media;
  readonly source: { readonly w: number; readonly h: number };
  readonly frame: Rect;
  readonly focus?: Rect;
  /** Frame (relative to this shot's start) at which the punch-in begins. */
  readonly focusAt?: number;
  readonly glow?: { readonly rect: Rect; readonly color: string };
  /** Display bounds (defaults to the 1600×900 recording frame, centred). */
  readonly box?: { readonly w: number; readonly h: number; readonly left?: number; readonly top?: number };
  readonly children?: React.ReactNode;
};

export const Shot: React.FC<ShotProps> = ({ media, source, frame: r0, focus, focusAt = 0, glow, box, children }) => {
  const frame = useCurrentFrame();
  const max = box ?? { w: LAYOUT.recordingFrame.width, h: LAYOUT.recordingFrame.height };
  const aspect = r0.w / r0.h;
  const w = Math.min(max.w, max.h * aspect);
  const h = w / aspect;
  const left = box?.left ?? (1920 - w) / 2;
  const top = box?.top ?? (1080 - h) / 2;

  const target = focus ? toAspect(focus, aspect, source) : r0;
  const t = focus
    ? interpolate(frame - focusAt, [0, MOTION.punchIn], [0, 1], { ...clamp, easing: ease(MOTION.easing.camera) })
    : 0;
  const r = {
    x: r0.x + (target.x - r0.x) * t,
    y: r0.y + (target.y - r0.y) * t,
    w: r0.w + (target.w - r0.w) * t,
  };
  const scale = w / r.w;
  const enter = useEntrance(0);
  const glowOn = glow
    ? interpolate(frame - focusAt - (focus ? MOTION.punchIn : 0), [0, MOTION.entrance], [0, 1], { ...clamp, easing: ease(MOTION.easing.camera) })
    : 0;

  const mediaStyle: React.CSSProperties = {
    position: "absolute",
    left: -r.x * scale,
    top: -r.y * scale,
    width: source.w * scale,
    height: source.h * scale,
  };

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: w,
        height: h,
        borderRadius: LAYOUT.recordingFrame.radius,
        overflow: "hidden",
        backgroundColor: "#000",
        boxShadow: LAYOUT.recordingFrame.shadow,
        opacity: interpolate(enter, [0, 0.6], [0, 1], clamp),
        scale: interpolate(enter, [0, 1], [0.96, 1]),
      }}
    >
      {"video" in media ? (
        <Video src={staticFile(media.video)} trimBefore={media.trimBefore} muted style={mediaStyle} />
      ) : (
        <Img
          src={staticFile(media.image)}
          style={{ ...mediaStyle, imageRendering: media.pixelated ? "pixelated" : "auto" }}
        />
      )}
      {glow ? (
        <Highlight
          left={(glow.rect.x - r.x) * scale}
          top={(glow.rect.y - r.y) * scale}
          width={glow.rect.w * scale}
          height={glow.rect.h * scale}
          color={glow.color}
          on={glowOn}
        />
      ) : null}
      {children}
    </div>
  );
};

/**
 * Marks one line: the rest of the frame dims (spotlight), then a soft marker fill and an underline
 * sweep left to right across the line. No hard box, so nothing has to sit pixel-perfect on the text.
 */
const Highlight: React.FC<{ left: number; top: number; width: number; height: number; color: string; on: number }> = ({ left, top, width, height, color, on }) => {
  const padX = 10;
  const padY = Math.max(4, height * 0.18);
  const box = { position: "absolute", left: left - padX, top: top - padY, height: height + 2 * padY } as const;
  const sweep = interpolate(on, [0.15, 1], [0, 1], clamp);
  return (
    <>
      <div style={{ ...box, width: width + 2 * padX, borderRadius: 6, boxShadow: `0 0 0 4000px rgb(3 10 20 / ${0.5 * on})` }} />
      <div
        style={{
          ...box,
          width: (width + 2 * padX) * sweep,
          borderRadius: 6,
          backgroundColor: `${color}38`,
          mixBlendMode: "screen",
          boxShadow: `0 0 ${18 * on}px ${color}55`,
        }}
      />
      <div style={{ position: "absolute", left: left - padX, top: top + height + padY - 3, width: (width + 2 * padX) * sweep, height: 3, borderRadius: 2, backgroundColor: color }} />
    </>
  );
};

// ---------------------------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------------------------

/** A small label pill, e.g. "Live run · 2× speed". */
export const Chip: React.FC<{
  readonly children: React.ReactNode;
  readonly at?: number;
  readonly style?: React.CSSProperties;
  readonly dot?: string;
}> = ({ children, at = 0, style, dot = COLORS.lime }) => {
  const enter = useEntrance(at);
  return (
    <div
      style={{
        position: "absolute",
        left: 160,
        top: 56,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 20px",
        borderRadius: 999,
        backgroundColor: "rgb(6 33 61 / 0.88)",
        border: "1px solid rgb(255 255 255 / 0.18)",
        color: COLORS.white,
        fontFamily: fontStack.mono,
        fontSize: 24,
        letterSpacing: "0.02em",
        opacity: enter,
        translate: `0px ${(1 - enter) * -12}px`,
        ...style,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 99, backgroundColor: dot, flexShrink: 0 }} />
      {children}
    </div>
  );
};

/**
 * The scene's approved on-screen lines (config SCENES[].lines), bottom centre on a dark scrim.
 * `stack`: lines accumulate. `replace`: a line leaves when a later line starts.
 */
export const Captions: React.FC<{
  readonly lines: readonly Line[];
  readonly mode?: "stack" | "replace";
  readonly exclude?: readonly string[];
  readonly bottom?: number;
}> = ({ lines, mode = "replace", exclude = [], bottom = 56 }) => {
  const frame = useCurrentFrame();
  const shown = lines.filter((l) => !exclude.includes(l.id));
  const starts = [...new Set(shown.map((l) => l.at))].sort((a, b) => a - b);
  return (
    <div
      style={{
        position: "absolute",
        left: 96,
        right: 96,
        bottom,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      {shown.map((line) => {
        if (frame < line.at) return null;
        const next = starts.find((t) => t > line.at);
        const leaving = mode === "replace" && next !== undefined && frame >= next;
        if (leaving && frame >= next + MOTION.exit) return null;
        return <CaptionLine key={line.id} line={line} exitAt={leaving ? next : undefined} />;
      })}
    </div>
  );
};

const CaptionLine: React.FC<{ readonly line: Line; readonly exitAt?: number }> = ({ line, exitAt }) => {
  const frame = useCurrentFrame();
  const enter = useEntrance(line.at);
  const exit = exitAt === undefined ? 0 : interpolate(frame - exitAt, [0, MOTION.exit], [0, 1], { ...clamp, easing: ease(MOTION.easing.exit) });
  return (
    <div
      style={{
        fontFamily: fontStack.display,
        fontWeight: 700,
        fontSize: 52,
        lineHeight: 1.15,
        color: COLORS.white,
        backgroundColor: LAYOUT.scrim,
        padding: "12px 28px",
        borderRadius: 10,
        textAlign: "center",
        opacity: Math.min(interpolate(enter, [0, 0.6], [0, 1], clamp), 1 - exit),
        translate: `0px ${(1 - enter) * 24}px`,
      }}
    >
      {copy(line.text)}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Verdicts, counters, logo, agents
// ---------------------------------------------------------------------------------------------

export type Verdict = "PASS" | "FAIL" | "INCONCLUSIVE";
const SIGN: Record<Verdict, string> = { PASS: "✓", FAIL: "✕", INCONCLUSIVE: "!" };

/** Optimus's verdict badge, as on the site and report. Glows only to carry the story. */
export const VerdictBadge: React.FC<{
  readonly verdict: Verdict;
  readonly size?: number;
  readonly at?: number;
  readonly glow?: boolean;
  readonly prefix?: string;
  readonly style?: React.CSSProperties;
}> = ({ verdict, size = 40, at = 0, glow = false, prefix, style }) => {
  const enter = useEntrance(at);
  const c = COLORS.verdict[verdict];
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.3,
        padding: `${size * 0.18}px ${size * 0.45}px`,
        borderRadius: size * 0.2,
        backgroundColor: c.bg,
        color: c.fg,
        border: `${Math.max(2, size * 0.06)}px solid ${c.fg}`,
        fontFamily: fontStack.mono,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "0.04em",
        boxShadow: glow ? `0 0 ${size}px ${size * 0.25}px ${c.glow}AA` : "none",
        opacity: interpolate(enter, [0, 0.5], [0, 1], clamp),
        scale: interpolate(enter, [0, 1], [0.8, 1]),
        ...style,
      }}
    >
      {prefix ? <span style={{ fontWeight: 400, opacity: 0.8 }}>{prefix}</span> : null}
      <span>{SIGN[verdict]}</span>
      <span>{verdict}</span>
    </div>
  );
};

/** Counts from 0 to `to` over ~1 s starting at `at` (brief §4: never jumps). */
export const CountUp: React.FC<{ readonly to: number; readonly at?: number; readonly style?: React.CSSProperties }> = ({ to, at = 0, style }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame - at, [0, MOTION.countUp], [0, to], { ...clamp, easing: Easing.out(Easing.cubic) });
  return <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{Math.round(v)}</span>;
};

/** One frame of an agent sprite (rest/blink strip), whole-number scale, blinking now and then. */
export const Agent: React.FC<{
  readonly name: "contract" | "runner" | "evidence" | "verdict" | "smith";
  readonly scale?: number;
  readonly style?: React.CSSProperties;
  readonly blinkOffset?: number;
}> = ({ name, scale = 2, style, blinkOffset = 0 }) => {
  const frame = useCurrentFrame();
  const size = { contract: [90, 84], runner: [80, 85], evidence: [90, 84], verdict: [84, 87], smith: [81, 86] }[name];
  const blink = (frame + blinkOffset) % 200 < 7 ? 1 : 0;
  return (
    <div style={{ width: size[0] * scale, height: size[1] * scale, overflow: "hidden", ...style }}>
      <Img
        src={staticFile(`art/agents/${name}.png`)}
        style={{
          width: size[0] * 2 * scale,
          height: size[1] * scale,
          imageRendering: "pixelated",
          translate: `${-blink * size[0] * scale}px 0px`,
        }}
      />
    </div>
  );
};
