import { AGENTS, FOOT_Y, HERO_LAYERS, SCENE, px, py } from "@/content/scene";

/** The clouds' band, in percent of the scene: top sky only, ending before the observatory. */
// Ends at 14.5% of the scene: above the hero eyebrow even on the tallest hero (960px).
const CLOUD_BAND = { top: 7, w: 62, h: 7.5 };

/**
 * Keyframes for the hand-off spark. The track is a full-scene layer, so translate percentages are
 * percentages of the scene: the spark hops prop to prop along small arcs, compositor-only.
 */
function handoffKeyframes() {
  const stops = AGENTS.filter((a) => a.prop && a.id !== "smith").map((a) => a.prop!);
  const at = (x: number, y: number, opacity?: number) =>
    `transform: translate(${px(x)}, ${py(y)});${opacity === undefined ? "" : ` opacity: ${opacity};`}`;
  const start = 4;
  const hop = 14;
  const frames: string[] = [`0% { ${at(stops[0].x, stops[0].y, 0)} }`, `${start}% { ${at(stops[0].x, stops[0].y, 1)} }`];
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    const t0 = start + (i - 1) * hop;
    frames.push(`${t0 + hop / 2}% { ${at((a.x + b.x) / 2, Math.min(a.y, b.y) - 16)} }`);
    frames.push(`${t0 + hop}% { ${at(b.x, b.y, 1)} }`);
  }
  const end = start + (stops.length - 1) * hop;
  const last = stops[stops.length - 1];
  frames.push(`${end + 2}% { ${at(last.x, last.y, 0)} }`, `100% { ${at(last.x, last.y, 0)} }`);
  const tickOn = end + 1;
  return `@keyframes handoff { ${frames.join(" ")} }
@keyframes tick { 0%, ${tickOn - 0.5}% { opacity: 0; } ${tickOn}%, ${tickOn + 22}% { opacity: 1; } ${tickOn + 22.5}%, 100% { opacity: 0; } }`;
}

/** A 7x6 pixel tick, drawn on the art grid. */
function PixelTick() {
  const cells = [[6, 0], [5, 1], [6, 1], [4, 2], [5, 2], [0, 3], [3, 3], [4, 3], [1, 4], [2, 4], [3, 4], [2, 5]];
  return (
    <svg viewBox="0 0 7 6" shapeRendering="crispEdges" className="size-full" aria-hidden="true">
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="var(--lime)" />
      ))}
    </svg>
  );
}

export function HeroScene() {
  const verdict = AGENTS.find((a) => a.id === "verdict")!;
  return (
    <div className="hero-scene" role="group" aria-label="The Optimus pipeline: five agents on the observatory terrace">
      <style>{handoffKeyframes()}</style>
      {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must not be resampled */}
      <img
        src={HERO_LAYERS.scene.src}
        alt=""
        aria-hidden="true"
        className="scene-layer inset-0 size-full"
        width={SCENE.w}
        height={SCENE.h}
        fetchPriority="high"
      />
      <div aria-hidden="true" className="cloud-band">
        {HERO_LAYERS.clouds.map((c) => (
          <div
            key={c.src}
            className="cloud-track"
            style={{ animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.src}
              alt=""
              style={{
                top: `${((c.y - CLOUD_BAND.top) / CLOUD_BAND.h) * 100}%`,
                width: `${(c.w / (SCENE.w * CLOUD_BAND.w / 100)) * 100}%`,
                height: `${(c.h / (SCENE.h * CLOUD_BAND.h / 100)) * 100}%`,
              }}
            />
          </div>
        ))}
      </div>
      {[
        ...HERO_LAYERS.sway.map((f) => ({ ...f, dur: f.frames / 8 })),
        ...HERO_LAYERS.falls.map((f) => ({ ...f, dur: f.frames / 12 })),
      ].map((f) => (
        <div
          key={f.src}
          aria-hidden="true"
          className="scene-layer strip"
          style={{
            left: px(f.x),
            top: py(f.y),
            width: px(f.w),
            height: py(f.h),
            ["--frames" as string]: f.frames,
            ["--dur" as string]: `${f.dur}s`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={f.src} alt="" />
        </div>
      ))}
      {HERO_LAYERS.lanterns.map((l) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={l.src}
          src={l.src}
          alt=""
          aria-hidden="true"
          className="scene-layer lantern-glow"
          style={{ left: px(l.x), top: py(l.y), width: px(l.w), height: py(l.h), animationDelay: `${l.delay}s` }}
        />
      ))}

      <ul className="contents">
        {AGENTS.map((a) => (
          <li
            key={a.id}
            className={a.mobile ? "contents" : "contents max-md:hidden"}
          >
            <a
              href={a.href}
              className="group absolute block rounded-sm"
              style={{ left: px(a.x - a.frameW / 2), top: py(FOOT_Y - a.frameH), width: px(a.frameW), height: py(a.frameH) }}
              aria-label={`${a.name}: ${a.caption}`}
            >
              <span
                aria-hidden="true"
                className="agent-sprite absolute inset-0 transition-transform duration-200 group-hover:-translate-y-[3%] group-focus-visible:-translate-y-[3%] motion-reduce:transition-none"
                style={{
                  backgroundImage: `url(${a.sprite})`,
                  ["--blink" as string]: `${a.blink}s`,
                  ["--blink-delay" as string]: `${a.blinkDelay}s`,
                }}
              />
              <span
                aria-hidden="true"
                className="glass pointer-events-none absolute bottom-full left-1/2 mb-2 w-max max-w-56 -translate-x-1/2 rounded-sm px-3 py-2 text-left text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <span className="block font-extrabold">{a.name}</span>
                <span className="block">{a.caption}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <span aria-hidden="true" className="handoff-track max-md:hidden">
        <span className="handoff" />
      </span>
      <span
        aria-hidden="true"
        className="handoff-tick"
        style={{ left: px(verdict.x - 4), top: py(FOOT_Y - verdict.frameH - 14), width: px(8), height: py(7) }}
      >
        <PixelTick />
      </span>
    </div>
  );
}
