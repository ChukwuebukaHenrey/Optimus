/**
 * Scene 6 · Close: the on-camera test run ("Run the offline tests,"), the report ("open the report…
 * and see the proof."), then a motion-design logo ending under the closing paragraph:
 * a scan line sweeps, the Optimus mark draws itself in lime and lands on the music's final section
 * (fill, pulse ring, pixel sparks), the wordmark rises letter by letter, the tagline appears line by
 * line as it is spoken, and the five agents walk onto the terrace as on the website.
 */
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, copy, CTA, LOGO, MOTION, PIXEL_ART, SHOTS, type Scene } from "../config";
import { Captions, Chip, ease, Shot, SkyBackdrop, useEntrance } from "../components/kit";
import { MARK_PATH, MARK_VIEWBOX } from "../../../src/report/mark";
import { fontStack } from "../fonts";
import { freeze, rec } from "./shots";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Scene6: React.FC<{ readonly scene: Scene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const sh = SHOTS["6"];
  const line = (id: string) => scene.lines.find((l) => l.id === id);
  const tagline = line("tagline");
  const urls = line("urls");
  const endFrom = Math.round(sh.endCard.from * fps);
  const seg = (s: { from: number; to: number }) => ({ from: Math.round(s.from * fps), durationInFrames: Math.round((s.to - s.from) * fps) });
  return (
    <AbsoluteFill>
      <Sequence name="npm test (R8)" {...seg(sh.tests)}>
        <SkyBackdrop />
        <Shot {...freeze(sh.tests.freeze)} frame={sh.tests.frame} focus={sh.tests.focus} focusAt={Math.round(sh.tests.focusAt * fps)} glow={{ rect: sh.tests.glow, color: COLORS.verdict.PASS.glow }} />
        <Captions lines={scene.lines} exclude={["tagline", "urls"]} />
      </Sequence>
      <Sequence name="Report (archived)" {...seg(sh.report)}>
        <SkyBackdrop />
        <Shot {...rec(sh.report.rec, sh.report.trim)} frame={sh.report.frame} />
        <Chip>{sh.report.label}</Chip>
      </Sequence>
      <Sequence name="Logo ending" from={endFrom}>
        <EndCard
          hit={Math.round((sh.endCard.markHit - sh.endCard.from) * fps)}
          tagline={tagline ? copy(tagline.text) : ""}
          tagAt={sh.endCard.tagParts.map((t) => Math.round((t - sh.endCard.from) * fps))}
          urlsAt={urls ? urls.at - endFrom : 0}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// The logo ending
// ---------------------------------------------------------------------------------------------

const MARK = 170;
const LEFT = 150;
const TOP = 170;

const EndCard: React.FC<{ readonly hit: number; readonly tagline: string; readonly tagAt: readonly number[]; readonly urlsAt: number }> = ({ hit, tagline, tagAt, urlsAt }) => {
  const frame = useCurrentFrame();
  const p = PIXEL_ART.heroPlate;
  const dim = interpolate(frame, [0, 24], [0, 1], clamp);
  // The tagline as spoken: "One contract." / "Many independent builds." / "Evidence you can inspect."
  const parts = tagline.split(/(?<=\.)\s+/);
  const url = useEntrance(urlsAt);
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.sky }}>
      <Img src={staticFile(p.file)} style={{ width: p.width * p.scale, height: p.height * p.scale, imageRendering: "pixelated" }} />
      <AbsoluteFill style={{ background: `linear-gradient(90deg, rgb(6 33 61 / ${0.86 * dim}) 0%, rgb(6 33 61 / ${0.6 * dim}) 50%, rgb(6 33 61 / 0) 78%)` }} />
      <ScanLine hit={hit} />
      <div style={{ position: "absolute", left: LEFT, top: TOP, display: "flex", alignItems: "center", gap: 34 }}>
        <DrawnMark hit={hit} />
        <Wordmark at={hit + 9} />
      </div>
      <div style={{ position: "absolute", left: LEFT, top: TOP + MARK + 70, display: "flex", flexDirection: "column", gap: 6 }}>
        {parts.map((part, i) => (
          <TagLine key={part} text={part} at={tagAt[i] ?? tagAt[tagAt.length - 1]} accent={i === parts.length - 1} />
        ))}
      </div>
      <div style={{ position: "absolute", left: LEFT, top: TOP + MARK + 330, display: "flex", flexDirection: "column", gap: 14, opacity: url, translate: `0px ${(1 - url) * 20}px` }}>
        <Url>{CTA.website}</Url>
        <Url>{CTA.repo}</Url>
      </div>
      <WalkIn start={6} />
    </AbsoluteFill>
  );
};

/** A lime scan line sweeps across the logo area and arrives as the mark lands. */
const ScanLine: React.FC<{ readonly hit: number }> = ({ hit }) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, hit], [LEFT - 80, LEFT + MARK + 40], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const o = interpolate(frame, [0, 6, hit - 4, hit + 6], [0, 0.9, 0.9, 0], clamp);
  return (
    <div style={{ position: "absolute", left: x, top: TOP - 40, width: 4, height: MARK + 80, backgroundColor: COLORS.lime, opacity: o, boxShadow: `0 0 24px 6px ${COLORS.lime}88`, borderRadius: 2 }} />
  );
};

/** The mark draws in lime, then lands: white fill, a slight pop, a pulse ring and pixel sparks. */
const DrawnMark: React.FC<{ readonly hit: number }> = ({ hit }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [2, hit], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const fill = interpolate(frame, [hit, hit + 12], [0, 1], clamp);
  const pop = interpolate(frame, [hit, hit + 18], [0.9, 1], { ...clamp, easing: ease(MOTION.easing.entrance) });
  const ring = interpolate(frame, [hit, hit + 48], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const sparks = interpolate(frame, [hit, hit + 40], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  return (
    <div style={{ position: "relative", width: MARK, height: MARK }}>
      {/* pulse ring */}
      <div
        style={{
          position: "absolute",
          left: MARK / 2,
          top: MARK / 2,
          width: MARK * (0.8 + ring * 1.4),
          height: MARK * (0.8 + ring * 1.4),
          translate: "-50% -50%",
          borderRadius: "50%",
          border: `3px solid ${COLORS.lime}`,
          opacity: frame < hit ? 0 : 0.8 * (1 - ring),
        }}
      />
      {/* pixel sparks: square "evidence" pixels burst from the mark */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 + 0.26;
        const d = MARK * (0.45 + sparks * (0.55 + (i % 3) * 0.18));
        const size = 8 + (i % 2) * 4;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: MARK / 2 + Math.cos(a) * d - size / 2,
              top: MARK / 2 + Math.sin(a) * d - size / 2,
              width: size,
              height: size,
              backgroundColor: i % 3 === 0 ? COLORS.white : COLORS.lime,
              opacity: frame < hit ? 0 : 1 - sparks,
            }}
          />
        );
      })}
      <svg width={MARK} height={MARK} viewBox={MARK_VIEWBOX} style={{ position: "absolute", inset: 0, scale: String(pop), overflow: "visible" }}>
        <path
          d={MARK_PATH}
          fillRule="evenodd"
          clipRule="evenodd"
          fill={COLORS.white}
          fillOpacity={fill}
          stroke={COLORS.lime}
          strokeWidth={0.7}
          strokeLinejoin="round"
          pathLength={100}
          strokeDasharray="100 100"
          strokeDashoffset={100 * (1 - draw)}
          strokeOpacity={1 - fill * 0.85}
          style={{ filter: `drop-shadow(0 0 ${6 * (1 - fill) + 2}px ${COLORS.lime})` }}
        />
      </svg>
    </div>
  );
};

/** "Optimus", one letter at a time, each rising out of a mask; a lime bar sweeps beneath. */
const Wordmark: React.FC<{ readonly at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const letters = [...LOGO.word];
  const bar = interpolate(frame, [at + letters.length * 3 + 6, at + letters.length * 3 + 30], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", overflow: "hidden", paddingBottom: 8 }}>
        {letters.map((ch, i) => {
          const t = interpolate(frame, [at + i * 3, at + i * 3 + MOTION.entrance], [0, 1], { ...clamp, easing: ease(MOTION.easing.entrance) });
          return (
            <span
              key={i}
              style={{ fontFamily: fontStack.display, fontWeight: 800, fontSize: 150, lineHeight: 1, letterSpacing: "-0.02em", color: COLORS.white, translate: `0px ${(1 - t) * 160}px`, opacity: interpolate(t, [0, 0.4], [0, 1], clamp) }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <div style={{ height: 10, width: `${bar * 100}%`, backgroundColor: COLORS.lime, borderRadius: 3 }} />
    </div>
  );
};

const TagLine: React.FC<{ readonly text: string; readonly at: number; readonly accent: boolean }> = ({ text, at, accent }) => {
  const enter = useEntrance(at);
  return (
    <div
      style={{
        fontFamily: fontStack.display,
        fontWeight: accent ? 700 : 300,
        fontSize: 58,
        lineHeight: 1.15,
        color: accent ? COLORS.lime : COLORS.white,
        opacity: interpolate(enter, [0, 0.5], [0, 1], clamp),
        translate: `${(1 - enter) * -30}px 0px`,
      }}
    >
      {text}
    </div>
  );
};

const Url: React.FC<{ readonly children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontFamily: fontStack.mono, fontSize: 32, color: COLORS.ink, backgroundColor: COLORS.lime, padding: "8px 20px", borderRadius: 8, alignSelf: "flex-start" }}>
    {children}
  </span>
);

// ---------------------------------------------------------------------------------------------
// The agents walk onto the terrace (website hero choreography: two walk cycles, 28 art px, 1.6 s)
// ---------------------------------------------------------------------------------------------

type AgentName = "contract" | "runner" | "evidence" | "verdict" | "smith";
const SHEETS: Record<AgentName, { w: number; h: number; count: number; walk?: [number, number]; action: [number, number] }> = {
  contract: { w: 90, h: 84, count: 26, walk: [18, 25], action: [2, 9] },
  runner: { w: 80, h: 85, count: 18, action: [2, 9] },
  evidence: { w: 90, h: 84, count: 26, walk: [18, 25], action: [2, 9] },
  verdict: { w: 84, h: 87, count: 26, walk: [18, 25], action: [2, 9] },
  smith: { w: 81, h: 86, count: 26, walk: [18, 25], action: [2, 9] },
};
const SCALE = 2;
const WALK_PX = 28;

const WalkIn: React.FC<{ readonly start: number }> = ({ start }) => {
  const order: AgentName[] = ["contract", "runner", "evidence", "verdict", "smith"];
  return (
    <div style={{ position: "absolute", right: 50, bottom: 140, display: "flex", gap: 12, alignItems: "flex-end" }}>
      {order.map((name, i) => (
        <SheetAgent key={name} name={name} start={start + i * 4} />
      ))}
    </div>
  );
};

const SheetAgent: React.FC<{ readonly name: AgentName; readonly start: number }> = ({ name, start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = SHEETS[name];
  const walkDur = Math.round(1.6 * fps);
  const t = frame - start;
  let idx = 0;
  let dx = 0;
  if (a.walk) {
    // Two walk cycles while sliding 28 art px into place; then rest, blinking now and then.
    const step = Math.floor((Math.max(0, t) / walkDur) * 16);
    idx = t < walkDur ? a.walk[0] + (step % 8) : (frame + start * 7) % 200 < 7 ? 1 : 0;
    dx = Math.round(interpolate(t, [0, walkDur], [-WALK_PX, 0], clamp)) * SCALE;
  } else {
    // The runner types at its laptop.
    idx = a.action[0] + (Math.floor(Math.max(0, t) / 6) % (a.action[1] - a.action[0] + 1));
  }
  const appear = interpolate(t, [0, 8], [0, 1], clamp);
  return (
    <div style={{ width: a.w * SCALE, height: a.h * SCALE, overflow: "hidden", translate: `${dx}px 0px`, opacity: appear }}>
      <Img
        src={staticFile(`art/agents/${name}-sheet.png`)}
        style={{ width: a.w * a.count * SCALE, height: a.h * SCALE, imageRendering: "pixelated", translate: `${-idx * a.w * SCALE}px 0px` }}
      />
    </div>
  );
};
