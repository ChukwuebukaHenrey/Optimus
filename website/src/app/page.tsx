import { Hero } from "@/components/hero/hero";
import {
  ContractChapter,
  DocsTeaser,
  EvidenceChapter,
  FinalCta,
  ProofStrip,
  RepairChapter,
  SiteFooter,
  VerdictsChapter,
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
