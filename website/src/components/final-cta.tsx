import { ArrowRight, GithubLogo } from "@phosphor-icons/react/dist/ssr";
import dusk from "@/content/dusk-layers.json";
import { REPO_URL } from "@/content/site";
import { Reveal } from "@/components/reveal";

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const W = dusk.scene.w;
const H = dusk.scene.h;
const CLOUDS = { top: 6, w: 55, h: 22 };

/**
 * The observatory at dusk behind the final call to action: waterfalls run, lanterns breathe, stars
 * twinkle and pink clouds drift (CSS layers on the art grid; the copy reveals with Motion).
 */
export function FinalCta() {
  return (
    <section aria-labelledby="final-title" className="on-dark relative isolate overflow-hidden bg-[#2a3a78] text-white">
      <div aria-hidden="true" className="dusk-frame absolute inset-0 -z-10">
        <div className="dusk-scene">
          {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must not be resampled */}
          <img src={dusk.scene.src} alt="" loading="lazy" className="scene-layer inset-0 size-full" />
          {dusk.stars.map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={s.src}
              src={s.src}
              alt=""
              loading="lazy"
              className="scene-layer twinkle inset-0 size-full"
              style={{ animationDuration: `${s.duration}s`, animationDelay: `${s.delay}s` }}
            />
          ))}
          <div className="cloud-band" style={{ top: `${CLOUDS.top}%`, width: `${CLOUDS.w}%`, height: `${CLOUDS.h}%` }}>
            {dusk.clouds.map((c) => (
              <div key={c.src} className="cloud-track" style={{ animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.src}
                  alt=""
                  loading="lazy"
                  style={{
                    top: `${((c.y - CLOUDS.top) / CLOUDS.h) * 100}%`,
                    width: `${(c.w / ((W * CLOUDS.w) / 100)) * 100}%`,
                    height: `${(c.h / ((H * CLOUDS.h) / 100)) * 100}%`,
                  }}
                />
              </div>
            ))}
          </div>
          {dusk.falls.map((f) => (
            <div
              key={f.src}
              className="scene-layer strip"
              style={{
                left: pct(f.x, W),
                top: pct(f.y, H),
                width: pct(f.w, W),
                height: pct(f.h, H),
                ["--frames" as string]: f.frames,
                ["--dur" as string]: "1s",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.src} alt="" loading="lazy" />
            </div>
          ))}
          {dusk.lanterns.map((l) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={l.src}
              src={l.src}
              alt=""
              loading="lazy"
              className="scene-layer lantern-glow"
              style={{ left: pct(l.x, W), top: pct(l.y, H), width: pct(l.w, W), height: pct(l.h, H), animationDelay: `${l.delay}s` }}
            />
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(6_33_61/0.6)_0%,rgb(6_33_61/0.3)_45%,transparent_70%)]" />
      <div className="mx-auto max-w-[1440px] px-4 py-32 md:px-16 md:py-40">
        <Reveal className="max-w-[560px]">
          <h2 id="final-title" className="headline">
            One contract. <span className="text-white/75">Many different builds.</span>
          </h2>
          <p className="mt-6 text-white/90">
            See every verdict, every screenshot and the full repair record from a real run — then point Optimus at your own
            builds.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="/report/" className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-6 font-extrabold text-ink hover:bg-white">
              See a real report <ArrowRight aria-hidden="true" weight="bold" className="size-4" />
            </a>
            <a href={REPO_URL} className="glass inline-flex h-12 items-center gap-2 rounded-full px-6 text-white hover:bg-[rgb(6_33_61/0.5)]">
              <GithubLogo aria-hidden="true" className="size-5" /> Get the code
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
