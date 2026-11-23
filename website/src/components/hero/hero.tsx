import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Entrance, EntranceItem } from "@/components/motion";
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
      className="on-dark relative isolate flex flex-col overflow-hidden bg-[#128aef] text-white md:block md:min-h-[max(640px,min(100svh,960px))]"
    >
      <div className="hero-frame relative order-2 md:absolute md:inset-0">
        <HeroScene />
      </div>

      {/* scrim: only behind the copy column, so white body text reaches 4.5:1 over the sky */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-[62%] bg-[linear-gradient(90deg,rgb(6_33_61/0.42)_0%,rgb(6_33_61/0.3)_55%,transparent_100%)] [mask-image:linear-gradient(180deg,black_0%,black_55%,transparent_75%)] md:block"
      />

      {/* Desktop: one copy column over the sky. Phones: headline above the scene, explanation below it. */}
      <div className="max-md:contents md:relative md:z-10 md:mx-auto md:max-w-[1440px] md:px-16 md:pt-36 md:pb-10">
        <Entrance className="relative z-10 order-1 max-w-[560px] px-4 pt-24 pb-6 max-md:bg-[linear-gradient(180deg,#0b5fa8_0%,#0e74cc_70%,#128aef_100%)] md:px-0 md:pt-0 md:pb-0">
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
        <Entrance className="relative z-10 order-3 max-w-[560px] px-4 pt-6 pb-14 max-md:bg-azure-deep md:px-0 md:pt-0 md:pb-0">
          <EntranceItem>
            <p className="font-extrabold md:mt-6">One contract. Many different builds. Evidence-backed verdicts.</p>
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
              href="#contract"
              className="glass inline-flex h-12 items-center rounded-full px-6 text-white transition-colors hover:bg-[rgb(6_33_61/0.5)]"
            >
              How it works
            </a>
          </EntranceItem>
        </Entrance>
      </div>

      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-10 h-6">
        <PixelEdge />
      </div>
    </section>
  );
}
