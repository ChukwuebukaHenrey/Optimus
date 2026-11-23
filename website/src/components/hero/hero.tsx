import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Entrance, EntranceItem } from "@/components/reveal";
import { HeroScene } from "./hero-scene";

/** Stepped pixel edge where the hero meets the paper page. */
function PixelEdge() {
  const steps = [3, 1, 2, 0, 2, 1, 3, 2, 0, 1, 2, 3, 1, 0, 2, 1, 3, 0, 2, 1, 2, 3, 0, 1];
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${steps.length} 4`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      className="absolute inset-x-0 bottom-0 h-6 w-full"
    >
      {steps.map((s, i) => (
        <rect key={i} x={i} y={s} width="1.02" height={4 - s} fill="var(--paper)" />
      ))}
    </svg>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="on-dark relative isolate flex min-h-[max(100svh,600px)] flex-col overflow-hidden bg-[#128aef] text-white md:min-h-[max(820px,min(100svh,960px))]"
    >
      {/* the scene fills the hero at every size; the copy sits in its sky */}
      <div className="hero-frame absolute inset-0">
        <HeroScene />
      </div>

      {/* scrims, so white body text reaches 4.5:1 over the sky: a column on desktop, a top band on phones */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-[62%] bg-[linear-gradient(90deg,rgb(6_33_61/0.42)_0%,rgb(6_33_61/0.3)_55%,transparent_100%)] [mask-image:linear-gradient(180deg,black_0%,black_55%,transparent_75%)] md:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[72%] bg-[linear-gradient(180deg,rgb(6_33_61/0.5)_0%,rgb(6_33_61/0.38)_55%,transparent_100%)] md:hidden"
      />

      <div className="relative z-10 w-full px-4 pt-24 md:mx-auto md:max-w-[1440px] md:px-16 md:pt-36 md:pb-10">
        <Entrance className="md:max-w-[560px]">
          <EntranceItem>
            <p className="label-mono text-white/85">Behavioural assessment for web apps</p>
          </EntranceItem>
          <EntranceItem>
            <h1 id="hero-title" className="headline mt-4 text-white">
              Grade the work.
              <span className="block text-white/75">Not how it was built.</span>
            </h1>
          </EntranceItem>
        </Entrance>
        <Entrance start={2} className="md:max-w-[560px]">
          <EntranceItem>
            <p className="mt-6 font-extrabold">One contract. Many different builds. Evidence-backed verdicts.</p>
            <p className="mt-2 text-white/90">
              Kane CLI acts in a real browser and records what it sees. Optimus judges that evidence against one
              unchanged contract — deterministically, with no AI deciding the verdict.
            </p>
          </EntranceItem>
          <EntranceItem className="mt-8 flex flex-wrap gap-4">
            <a
              href="/report/"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-6 font-extrabold text-ink transition-colors hover:bg-white"
            >
              See a real report
              <ArrowRight aria-hidden="true" weight="bold" className="size-4" />
            </a>
            <a
              href="#how"
              className="glass inline-flex h-12 items-center rounded-full px-6 text-white transition-colors hover:bg-[rgb(6_33_61/0.5)]"
            >
              How it works
            </a>
          </EntranceItem>
        </Entrance>
      </div>
      {/* room for the terrace and agents under the copy: they stand in the scene's lowest 40%, and the
          scene is 100vw tall on phones (zoomed to four agents) and 56.25vw from tablets up (full width) */}
      <div aria-hidden="true" className="min-h-[44vw] flex-1 md:min-h-[25vw]" />

      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-10 h-6">
        <PixelEdge />
      </div>
    </section>
  );
}
