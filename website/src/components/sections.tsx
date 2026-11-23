import { ArrowRight, CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { cn } from "cn";
import { Chapter } from "@/components/chapter";
import { Reveal } from "@/components/motion";
import { VerdictBadge } from "@/components/verdict-badge";
import type { SiteData } from "@/lib/bundle";

const shortHash = (h: string) => `${h.slice(0, 8)}…${h.slice(-4)}`;
const nf = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

/* ------------------------------------------------------------------ proof strip */

export function ProofStrip({ data }: { data: SiteData }) {
  const cal = data.calibration;
  const items = [
    cal && { value: `${cal.matched} / ${cal.cases}`, label: "calibration cases matched the expected verdict" },
    cal && { value: String(cal.replays), label: "replays counted toward any verdict" },
    data.repair && {
      value: String(data.repair.attempts),
      label: `live repair: ${data.repair.baseline} → fresh Kane run → ${data.repair.latest}`,
    },
    cal && {
      value: `≈ ${nf.format(cal.seconds / cal.cases / 60)} min`,
      label: `and ≈ ${nf.format(cal.credits / cal.cases)} credits per scenario run`,
    },
  ].filter(Boolean) as { value: string; label: string }[];
  return (
    <section aria-label="Measured results" className="bg-paper">
      <div className="mx-auto max-w-[1440px] px-4 md:px-16">
        <dl className="grid border-y border-rule sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <div key={item.label} className={cn("flex flex-col gap-2 py-8 sm:px-6", i > 0 && "max-sm:border-t sm:border-l", "border-rule")}>
              <dt className="sr-only">{item.label}</dt>
              <dd className="font-display text-[3rem] leading-[3.5rem] font-extrabold tabular-nums">{item.value}</dd>
              <dd className="text-ink-muted">{item.label}</dd>
            </div>
          ))}
        </dl>
        <p className="py-4 text-ink-muted">
          From {data.assessmentName}, contract <span className="font-mono">{data.pack.name} v{data.pack.version}</span>. Screenshot labels from
          calibration are still pending independent review.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 1.0 contract */

export function ContractChapter({ data }: { data: SiteData }) {
  const s = data.contractScenario;
  return (
    <Chapter
      id="contract"
      number="1.0"
      label="Contract"
      title="One approved contract."
      titleMuted="Applied unchanged to every build."
      lead={
        <p>
          A contract (a pack) describes what to do and what to record — never what should happen. Optimus turns it into
          neutral steps for Kane, and keeps the checks to itself. Every build in a comparison is judged against the same
          contract hash.
        </p>
      }
      points={[
        { title: "Neutral steps", body: "Kane receives actions and recording prompts only. No expected values, no verify lines, nothing that hints at the answer." },
        { title: "One hash for every build", body: <>Each run records the contract&apos;s content hash. This comparison used <span className="font-mono">{shortHash(data.pack.packHash)}</span> for every build.</> },
        { title: "Relative to the starting state", body: "Checks compare before and after, never absolute counts, so apps that start with sample data are judged fairly." },
      ]}
      art="/art/editorial/E-01-contract.png"
      artAlt="Pixel art: the Optimus agent holds one scroll whose light reaches three differently built model houses."
    >
      {s && (
        <div className="grid items-start gap-4 md:grid-cols-2">
          <div className="rounded-sm border border-rule bg-white p-4">
            <p className="label-mono text-ink-muted">Sent to Kane</p>
            <ol className="mt-3 flex flex-col gap-3">
              {s.sentToKane.steps.map((step) => (
                <li key={step.stepId}>
                  <p>{step.action}</p>
                  {Object.keys(step.record).length > 0 && (
                    <p className="mt-1 font-mono text-ink-muted">record: {Object.keys(step.record).join(", ")}</p>
                  )}
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-sm border border-dashed border-charcoal/40 bg-paper-2 p-4">
            <p className="label-mono text-ink-muted">Judged by Optimus — never sent</p>
            <ul className="mt-3 flex flex-col gap-3">
              {s.judgedByOptimus.checks.map((c) => (
                <li key={c.text} className="break-words">
                  {c.prerequisite && <span className="font-mono text-ink-muted">prerequisite · </span>}
                  {c.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-ink-muted md:col-span-2">
            Real contract excerpt: scenario <span className="font-mono">{s.id}</span>. <span className="font-mono">{"{{nonce}}"}</span> is filled with a
            fresh run id each time; the hash covers the unexpanded contract.
          </p>
        </div>
      )}
    </Chapter>
  );
}

/* ------------------------------------------------------------------ 2.0 evidence */

export function EvidenceChapter({ data }: { data: SiteData }) {
  const e = data.evidence;
  const shots = e?.steps.filter((s) => s.screenshot) ?? [];
  return (
    <Chapter
      id="evidence"
      number="2.0"
      label="Evidence"
      title="Kane acts and records."
      titleMuted="Every step leaves evidence."
      lead={
        <p>
          Kane CLI drives a real browser, performs each step and stores what it sees. Optimus reads that evidence in a
          normalized form. If an action was not established, there is no verdict — a missed click looks exactly like a
          broken button, so it is never called a failure.
        </p>
      }
      points={[
        { title: "Recorded, not inferred", body: "Missing data stays missing. Optimus never fills a gap with a guess." },
        { title: "No replay counts", body: "Every judged run is authored fresh. A run with any replay decision is rejected." },
        { title: "Not enough evidence is not a fail", body: "INCONCLUSIVE, NOT RUN and INFRA ERROR mean “no judgement”, and look like it." },
      ]}
      art="/art/editorial/E-02-evidence.png"
      artAlt="Pixel art: the browser runner at a laptop sends picture frames to a board, where the Optimus agent inspects them."
    >
      {e && (
        <figure className="rounded-sm border border-rule bg-white p-4">
          <figcaption className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <span className="font-extrabold">{e.buildLabel}</span> · {e.scenarioName} (<span className="font-mono">{e.scenarioId}</span>)
            </span>
            <VerdictBadge verdict={e.verdict} />
          </figcaption>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {shots.map((s) => (
              <div key={s.stepId}>
                {/* the archived frame is a full 16:9 browser window; crop in on the app itself */}
                <a href={`/report/${s.screenshot}`} className="block aspect-[4/3] overflow-hidden rounded-sm border border-rule bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/report/${s.screenshot}`}
                    alt={`End-of-step screenshot after “${s.action}”`}
                    loading="lazy"
                    className="w-full origin-[50%_0%] scale-[1.9]"
                  />
                </a>
                <p className="mt-2">{s.action}</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 font-mono">
                  {Object.entries(s.values).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-ink-muted">{k}</dt>
                      <dd className="break-all">{v ?? "missing"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <p className="mt-4 text-ink-muted">Real archived screenshots and the values Kane recorded at the end of each step.</p>
        </figure>
      )}
    </Chapter>
  );
}

/* ------------------------------------------------------------------ 3.0 verdicts */

export function VerdictsChapter({ data }: { data: SiteData }) {
  return (
    <section id="verdicts" aria-labelledby="verdicts-title" className="scroll-mt-24 bg-paper text-ink">
      <div className="mx-auto max-w-[1440px] px-4 py-24 md:px-16 md:py-32">
        <Reveal className="max-w-[720px]">
          <p className="label-mono text-ink-muted">3.0 — Verdicts</p>
          <h2 id="verdicts-title" className="headline mt-4">
            A clear answer, <span className="text-ink-muted">backed by a run.</span>
          </h2>
          <p className="mt-6">
            Four builds of the same Library assignment — vanilla JavaScript, React, and two with planted bugs — judged by one
            contract. Each verdict comes from Optimus&apos;s deterministic checks. A repaired build keeps its baseline
            verdict next to the verified one; history is never overwritten.
          </p>
        </Reveal>
        <Reveal delay={0.08} className="relative mt-12 overflow-hidden rounded-sm">
          {/* the real report, framed over the observatory */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/scene/H-01-plate.png" alt="" aria-hidden="true" loading="lazy" className="pixelated absolute inset-0 size-full object-cover" />
          <div className="relative p-4 sm:p-8 lg:p-12">
            <div className="mx-auto max-w-[960px] rounded-sm border border-white/60 bg-paper/95 p-4 backdrop-blur-md sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-4">
                <p className="font-extrabold">{data.assessmentName}</p>
                <p className="font-mono text-ink-muted">
                  contract {data.pack.name} v{data.pack.version} · {shortHash(data.pack.packHash)}
                </p>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <caption className="sr-only">Verdict for every build and scenario</caption>
                  <thead>
                    <tr className="border-b border-rule">
                      <th scope="col" className="py-3 pr-4 font-extrabold">Build</th>
                      {data.scope.map((s) => (
                        <th key={s.id} scope="col" className="px-2 py-3 font-extrabold">
                          {s.name} <span className="font-mono font-normal text-ink-muted">{s.id}</span>
                        </th>
                      ))}
                      <th scope="col" className="py-3 pl-2 font-extrabold">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.matrix.map((row) => (
                      <tr key={row.buildId} className="border-b border-rule last:border-0">
                        <th scope="row" className="py-4 pr-4 align-top font-normal">
                          {row.label}
                          {row.repairState === "repaired" && <span className="mt-1 block font-mono text-ink-muted">repaired by agent</span>}
                        </th>
                        {row.cells.map((c) => (
                          <td key={c.scenarioId} className="px-2 py-4 align-top">
                            {c.changed && c.baseline !== c.latest ? (
                              <div className="flex flex-col gap-1">
                                <span className="flex items-center gap-2">
                                  <span className="font-mono text-ink-muted">baseline</span>
                                  <VerdictBadge verdict={c.baseline} />
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="font-mono text-ink-muted">verified</span>
                                  <VerdictBadge verdict={c.latest} />
                                </span>
                              </div>
                            ) : (
                              <VerdictBadge verdict={c.latest} />
                            )}
                          </td>
                        ))}
                        <td className="py-4 pl-2 align-top font-mono tabular-nums">
                          {row.score === null ? "Provisional" : `${Math.round(row.score * 100)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-4">
                <p className="text-ink-muted">Rendered at build time from the validated comparison bundle.</p>
                <a href="/report/" className="inline-flex items-center gap-2 rounded-full bg-charcoal px-5 py-2 font-extrabold text-paper hover:bg-ink">
                  Open the full report <ArrowRight aria-hidden="true" weight="bold" className="size-4" />
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 4.0 repair */

export function RepairChapter({ data }: { data: SiteData }) {
  const r = data.repair;
  if (!r) return null;
  const diffLines = r.diff.split("\n").filter((l) => !l.startsWith("index "));
  return (
    <Chapter
      id="repair"
      tone="azure"
      number="4.0"
      label="Repair"
      title="A verified failure goes to a coding agent."
      titleMuted="A fresh run checks the fix."
      lead={
        <p>
          Only a verified FAIL can start a repair. The agent gets a narrow brief — the requirement, expected versus
          observed — and may change only a copy of the app. Optimus then reruns every calibrated scenario with a new
          Kane session. The agent never judges.
        </p>
      }
      points={[
        { title: "Only a verified FAIL starts it", body: "INCONCLUSIVE stops the loop for review; an infrastructure error gets one retry. Nothing unresolved reaches the agent." },
        { title: "The contract can't move", body: "Before every rerun Optimus checks the contract hash and the evaluator and Kane adapter files are unchanged." },
        { title: "Capped, recorded, auditable", body: "At most 3 attempts, 1,500 credits and 20 minutes. Every link from failure to fresh run is written to the repair history." },
      ]}
      art="/art/editorial/E-04-repair.png"
      artAlt="Pixel art: the Optimus agent hands a note to the repair smith, who fits a glowing code tile into a model house while the browser runner waits."
    >
      <ol className="flex flex-col gap-4">
        <li className="rounded-sm border border-white/25 bg-azure-ink/40 p-4">
          <p className="label-mono text-white/75">Baseline · {r.buildLabel}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <span>
              {r.scenarioName} (<span className="font-mono">{r.scenarioId}</span>)
            </span>
            <VerdictBadge verdict={r.baseline} />
          </p>
        </li>
        <li className="rounded-sm border border-dashed border-lime/70 bg-azure-ink/40 p-4">
          <p className="label-mono text-lime">Sent to the coding agent{r.agent ? ` · ${r.agent}` : ""}</p>
          <p className="mt-2 break-words">{r.requirement}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 font-mono">
            <dt className="text-white/70">expected</dt>
            <dd className="break-all">{r.expected}</dd>
            <dt className="text-white/70">observed</dt>
            <dd className="break-all">{r.observed}</dd>
          </dl>
        </li>
        <li className="rounded-sm border border-white/25 bg-azure-ink/60 p-4">
          <p className="label-mono text-white/75">Code change · {r.changedFiles.join(", ")}</p>
          <pre className="mt-3 max-h-96 overflow-y-auto font-mono text-[1rem] leading-6">
            {diffLines.map((line, i) => (
              <span
                key={i}
                className={cn(
                  "block whitespace-pre-wrap break-all",
                  line.startsWith("+") && !line.startsWith("+++") && "bg-[#1f5c2e] text-[#e3ffe8]",
                  line.startsWith("-") && !line.startsWith("---") && "bg-[#6b1f1f] text-[#ffe6e6]",
                  line.startsWith("@@") && "text-white/60",
                )}
              >
                {line || " "}
              </span>
            ))}
          </pre>
        </li>
        <li className="rounded-sm border border-white/25 bg-azure-ink/40 p-4">
          <p className="label-mono text-white/75">Integrity checks</p>
          <ul className="mt-2 flex flex-col gap-1">
            {r.integrity.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                {c.ok ? <CheckCircle aria-hidden="true" className="size-5 text-lime" /> : <WarningCircle aria-hidden="true" className="size-5 text-[#ffb4a8]" />}
                {c.label}
                <span className="sr-only">{c.ok ? "passed" : "problem"}</span>
              </li>
            ))}
          </ul>
        </li>
        <li className="rounded-sm border border-white/25 bg-azure-ink/40 p-4">
          <p className="label-mono text-white/75">Fresh Kane run · same contract</p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <span>
              {r.scenarioName} (<span className="font-mono">{r.scenarioId}</span>)
            </span>
            <VerdictBadge verdict={r.latest} />
          </p>
          <p className="mt-2 text-white/80">
            {r.outcome} {r.attempts} attempt · {r.creditsUsed !== null ? `${r.creditsUsed.toFixed(2)} credits` : "credits not recorded"} ·{" "}
            {r.minutes.toFixed(2)} min of agent time.
          </p>
        </li>
      </ol>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ docs teaser */

const DOCS = [
  { n: "I", title: "Write a contract", href: "/docs/#library-contract-versions" },
  { n: "II", title: "Run Kane on a build", href: "/docs/#live-runs-and-reports" },
  { n: "III", title: "Read the verdicts", href: "/docs/#offline-workflow" },
  { n: "IV", title: "Close the repair loop", href: "/docs/#repair-loop" },
];

export function DocsTeaser() {
  return (
    <section id="docs" aria-labelledby="docs-title" className="scroll-mt-24 border-t border-rule bg-paper-2">
      <div className="mx-auto max-w-[1440px] px-4 py-24 md:px-16">
        <Reveal>
          <p className="label-mono text-ink-muted">Documentation</p>
          <h2 id="docs-title" className="headline mt-4">
            Run it on your own builds. <span className="text-ink-muted">Four chapters.</span>
          </h2>
        </Reveal>
        <ol className="mt-12 grid border-t border-rule md:grid-cols-4">
          {DOCS.map((d, i) => (
            <li key={d.n} className={cn("border-b border-rule md:border-b-0", i > 0 && "md:border-l")}>
              <a href={d.href} className="group flex h-full flex-col gap-8 p-6 transition-colors hover:bg-paper">
                <span className="font-mono text-ink-muted">Chapter {d.n}</span>
                <span className="flex items-end justify-between gap-4 font-display text-[1.5rem] leading-8 font-extrabold">
                  {d.title}
                  <ArrowRight aria-hidden="true" className="size-6 shrink-0 transition-transform group-hover:translate-x-1" />
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ final call + footer */

export function FinalCta() {
  return (
    <section aria-labelledby="final-title" className="on-dark relative isolate overflow-hidden bg-[#2a3a78] text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/art/scene/F-01-dusk.png" alt="" aria-hidden="true" loading="lazy" className="pixelated absolute inset-0 -z-10 size-full object-cover object-[70%_50%]" />
      <div aria-hidden="true" className="absolute inset-y-0 left-0 -z-10 w-full bg-[linear-gradient(90deg,rgb(6_33_61/0.55)_0%,rgb(6_33_61/0.25)_50%,transparent_75%)]" />
      <div className="mx-auto max-w-[1440px] px-4 py-32 md:px-16 md:py-40">
        <Reveal className="max-w-[560px]">
          <h2 id="final-title" className="headline">
            One contract. <span className="text-white/75">Many different builds.</span>
          </h2>
          <p className="mt-6 text-white/90">See every verdict, every screenshot and the full repair record from a real run.</p>
          <a href="/report/" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-paper px-6 font-extrabold text-ink hover:bg-white">
            See a real report <ArrowRight aria-hidden="true" weight="bold" className="size-4" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-12 md:flex-row md:items-start md:justify-between md:px-16">
        <div>
          <p className="font-display text-[1.5rem] leading-8 font-extrabold">Optimus</p>
          <p className="mt-2 max-w-[40ch] text-paper/75">Evidence-backed behavioural verdicts for web apps. Built during the Kane CLI hackathon, 2026.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2">
          <Link className="hover:underline" href="/#contract">How it works</Link>
          <a className="hover:underline" href="/report/">Real report</a>
          <Link className="hover:underline" href="/#verdicts">Verdicts</Link>
          <a className="hover:underline" href="/docs/">Docs</a>
          <Link className="hover:underline" href="/#repair">Repair loop</Link>
          <a className="hover:underline" href="https://github.com/LambdaTest/kane-cli">Kane CLI</a>
        </nav>
      </div>
      <p className="mx-auto max-w-[1440px] px-4 pb-8 text-paper/60 md:px-16">
        Pixel art: original Optimus asset set, generated for this project. Kane CLI is a product of TestMu AI.
      </p>
    </footer>
  );
}
