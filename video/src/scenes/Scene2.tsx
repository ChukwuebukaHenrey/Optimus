/** Scene 2 · Problem: one assignment, five structurally different builds (A, B, C, D, U). */
import { AbsoluteFill, interpolate } from "remotion";
import { COLORS, MOTION, SHOTS, type Scene } from "../config";
import { Captions, Chip, DuskBackdrop, useEntrance } from "../components/kit";
import { fontStack } from "../fonts";

type Layout = "list" | "grid" | "table" | "cards" | "sealed";
const BUILDS: ReadonlyArray<{ id: string; label: string; layout: Layout }> = [
  { id: "A", label: "Build A", layout: "list" },
  { id: "B", label: "Build B", layout: "grid" },
  { id: "C", label: "Build C", layout: "table" },
  { id: "D", label: "Build D", layout: "cards" },
  { id: "U", label: "Build U · blind", layout: "sealed" },
];

const CARD_W = 300;
const GAP = 36;

export const Scene2: React.FC<{ readonly scene: Scene }> = ({ scene }) => {
  const total = BUILDS.length * CARD_W + (BUILDS.length - 1) * GAP;
  return (
    <AbsoluteFill>
      <DuskBackdrop />
      <div style={{ position: "absolute", top: 150, left: (1920 - total) / 2, display: "flex", gap: GAP }}>
        {BUILDS.map((b, i) => (
          <BuildCard key={b.id} build={b} at={Math.round(0.3 * 60) + i * MOTION.stagger * 3} />
        ))}
      </div>
      <Chip at={Math.round(1.2 * 60)} dot={COLORS.lime} style={{ top: 72, left: "50%", translate: "-50% 0px" }}>{SHOTS["2"].assignment}</Chip>
      <Captions lines={scene.lines} />
    </AbsoluteFill>
  );
};

const BuildCard: React.FC<{ readonly build: (typeof BUILDS)[number]; readonly at: number }> = ({ build, at }) => {
  const enter = useEntrance(at);
  return (
    <div
      style={{
        width: CARD_W,
        height: 400,
        borderRadius: 14,
        padding: 24,
        backgroundColor: "rgb(245 245 242 / 0.94)",
        boxShadow: "0 20px 50px rgb(6 33 61 / 0.5)",
        color: COLORS.ink,
        opacity: interpolate(enter, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
        translate: `0px ${(1 - enter) * 60}px`,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={{ fontFamily: fontStack.display, fontWeight: 800, fontSize: 72, lineHeight: 1 }}>{build.id}</span>
        <span style={{ fontFamily: fontStack.mono, fontSize: 20, color: COLORS.charcoal }}>{build.label}</span>
      </div>
      <div style={{ fontFamily: fontStack.display, fontWeight: 700, fontSize: 22, color: COLORS.deep, marginBottom: -6 }}>{SHOTS["2"].appTitle}</div>
      <Skeleton layout={build.layout} />
    </div>
  );
};

/** Abstract app layouts: the same assignment, built differently. No real UI implied. */
const Skeleton: React.FC<{ readonly layout: Layout }> = ({ layout }) => {
  const bar = (w: string, h = 14, c = "#D6D4CC") => <div style={{ width: w, height: h, borderRadius: 4, backgroundColor: c }} />;
  const box: React.CSSProperties = { flex: 1, borderRadius: 8, border: "2px solid #D6D4CC", padding: 14, display: "flex", gap: 10 };
  if (layout === "sealed")
    return (
      <div style={{ ...box, alignItems: "center", justifyContent: "center", flexDirection: "column", borderStyle: "dashed", borderColor: COLORS.deep }}>
        <div style={{ fontSize: 64 }}>✉</div>
        <div style={{ fontFamily: fontStack.mono, fontSize: 20, color: COLORS.deep, textAlign: "center" }}>bug sealed until grading</div>
      </div>
    );
  if (layout === "grid")
    return (
      <div style={{ ...box, flexWrap: "wrap", alignContent: "flex-start" }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ width: "46%", height: 70, borderRadius: 6, backgroundColor: i % 2 ? "#ECEBE6" : "#D6E8F8" }} />
        ))}
      </div>
    );
  if (layout === "table")
    return (
      <div style={{ ...box, flexDirection: "column" }}>
        {bar("100%", 20, "#B9C7D6")}
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{ display: "flex", gap: 8 }}>{bar("50%")}{bar("25%")}{bar("15%")}</div>
        ))}
      </div>
    );
  if (layout === "cards")
    return (
      <div style={{ ...box, flexDirection: "column" }}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: 8, borderRadius: 6, backgroundColor: "#ECEBE6" }}>
            <div style={{ width: 34, height: 44, borderRadius: 4, backgroundColor: "#C9D9C1" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>{bar("80%")}{bar("50%", 10)}</div>
          </div>
        ))}
      </div>
    );
  return (
    <div style={{ ...box, flexDirection: "column" }}>
      {bar("60%", 22, "#B9C7D6")}
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 14, height: 14, borderRadius: 99, backgroundColor: "#D6D4CC" }} />
          {bar(`${70 - i * 6}%`)}
        </div>
      ))}
    </div>
  );
};
