import { FinalCta } from "@/components/final-cta";
import { Hero } from "@/components/hero/hero";
import { Reveal } from "@/components/reveal";
import { RunReplay } from "@/components/run-replay";
import {
  ContractChapter,
  DocsTeaser,
  EvidenceChapter,
  ProofStrip,
  RepairChapter,
  SiteFooter,
  VerdictsChapter,
  WhatItDoes,
} from "@/components/sections";
import { SiteNav } from "@/components/site-nav";
import { WordSearch } from "@/components/word-search";
import { getSiteData } from "@/lib/bundle";

export default function Home() {
  const data = getSiteData();
  return (
    <>
      <SiteNav />
      <main id="main">
        <Hero />
        <ProofStrip data={data} />
        <WhatItDoes data={data} />
        {data.evidence && (
          <section id="watch" aria-labelledby="watch-title" className="scroll-mt-24 bg-azure-deep text-white">
            <div className="mx-auto max-w-[1440px] px-4 py-24 md:px-16">
              <Reveal className="max-w-[760px]">
                <p className="label-mono text-white/75">Watch a real run</p>
                <h2 id="watch-title" className="headline mt-4">
                  Kane acts. Optimus decides. <span className="text-white/70">A coding agent repairs.</span>
                </h2>
                <p className="mt-6 text-white/90">
                  A replay of a recorded run from the example: every step Kane performed, what it stored, the screenshot
                  it took, the verdict Optimus reached, and the repair that followed. Nothing here is mocked up.
                </p>
              </Reveal>
              <Reveal className="mt-12" from="up">
                <RunReplay evidence={data.evidence} repair={data.repair} />
              </Reveal>
            </div>
          </section>
        )}
        <ContractChapter data={data} />
        <EvidenceChapter data={data} />
        <VerdictsChapter data={data} />
        <RepairChapter data={data} />
        <DocsTeaser />
        <WordSearch />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
