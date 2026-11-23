import { HERO_LAYERS, SCENE, px, py } from "@/content/scene";
import { HeroCast } from "./hero-cast";

/**
 * Cloud bands, in percent of the scene. "clouds" ends at 14.5% (above the hero eyebrow even on the
 * tallest hero); "cloudsLow" drifts along the mountains, below the copy. Both fade out before the
 * observatory, which a page layer cannot pass behind.
 */
const CLOUD_BANDS = {
  clouds: { top: 7, w: 62, h: 7.5, className: "cloud-band" },
  cloudsLow: { top: 61, w: 40, h: 10, className: "cloud-band cloud-band-low" },
} as const;

function CloudBand({ band }: { band: keyof typeof CLOUD_BANDS }) {
  const b = CLOUD_BANDS[band];
  return (
    <div aria-hidden="true" className={b.className} style={{ top: `${b.top}%`, width: `${b.w}%`, height: `${b.h}%` }}>
      {HERO_LAYERS[band].map((c) => (
        <div key={c.src} className="cloud-track" style={{ animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must not be resampled */}
          <img
            src={c.src}
            alt=""
            style={{
              top: `${((c.y - b.top) / b.h) * 100}%`,
              width: `${(c.w / ((SCENE.w * b.w) / 100)) * 100}%`,
              height: `${(c.h / ((SCENE.h * b.h) / 100)) * 100}%`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function HeroScene() {
  return (
    <div className="hero-scene" role="group" aria-label="The Optimus pipeline: five agents on the observatory terrace">
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
      <CloudBand band="cloudsLow" />
      <CloudBand band="clouds" />
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
      <HeroCast />
    </div>
  );
}
