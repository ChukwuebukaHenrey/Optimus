import { ArrowRight, CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { cn } from "cn";
import { Chapter } from "@/components/chapter";
import { Logo } from "@/components/logo";
import { Reveal, Stagger, StaggerItem } from "@/components/reveal";
import { VerdictBadge } from "@/components/verdict-badge";
import { AGENTS } from "@/content/scene";
import { REPO_URL } from "@/content/site";
import type { SiteData } from "@/lib/bundle";

const shortHash = (h: string) => `${h.slice(0, 8)}…${h.slice(-4)}`;
const nf = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
/** Small counts read as words in running text ("five builds"); larger ones stay numerals. */
const words = (n: number) => WORDS[n] ?? String(n);

/** A small label that marks real data as coming from the example used on this page. */
function ExampleTag({ dark = false, children = "Example: Library assignment" }: { dark?: boolean; children?: string }) {
  return (
    <span className={cn("inline-block rounded-sm border px-2 py-0.5 font-mono text-[1rem] leading-6", dark ? "border-white/40 text-white/85" : "border-rule text-ink-muted")}>
      {children}
    </span>
  );
}

/** A recorded value: lists separated by | read one entry per line instead of breaking mid-word. */
function RecordedValue({ value }: { value: string | null }) {
  if (value === null) return <span className="text-ink-muted">missing</span>;
  const parts = value.split("|");
  return (
    <span className="flex flex-col">
      {parts.map((p, i) => (
        <span key={i} className="[overflow-wrap:anywhere]">
          {p}
          {i < parts.length - 1 && <span className="text-ink-muted"> |</span>}
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ proof strip */

export function ProofStrip({ data }: { data: SiteData }) {
  const cal = data.calibration;
  const items = [
    cal && { value: `${cal.matched} / ${cal.cases}`, label: "calibration cases matched the expected verdict" },
    cal && { value: String(cal.replays), label: "replays counted toward any verdict" },
    data.verifiedRepairs > 0 && {
      value: String(data.verifiedRepairs),
      label: `live repair${data.verifiedRepairs === 1 ? "" : "s"}: verified FAIL → fresh Kane run → PASS`,
    },
    cal && {
      value: `≈ ${nf.format(cal.seconds / cal.cases / 60)} min`,
      label: `and ≈ ${nf.format(cal.credits / cal.cases)} credits per scenario run`,
    },
  ].filter(Boolean) as { value: string; label: string }[];
  return (
    <section aria-label="Measured results" className="bg-paper">
      <div className="mx-auto max-w-[1440px] px-4 md:px-16">
        <Stagger className="grid grid-cols-1 border-y border-rule sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <StaggerItem key={item.label} className={cn("flex flex-col gap-2 py-8 sm:px-6", i > 0 && "max-sm:border-t sm:border-l", "border-rule")}>
              <p className="font-display text-[3rem] leading-[3.5rem] font-extrabold tabular-nums">{item.value}</p>
              <p className="text-ink-muted">{item.label}</p>
            </StaggerItem>
          ))}
        </Stagger>
        <p className="py-4 text-ink-muted">
          Measured on the example used throughout this page: calibration of the{" "}
          {data.assessmentName.replace(/ assessment$/i, "")} assignment, {cal ? `${words(cal.apps)} builds × ` : ""}
          {data.scope.length} scenarios{cal ? ` × ${words(cal.trials)} trials` : ""}, contract{" "}
          <span className="font-mono">{data.pack.name} v{data.pack.version}</span>. The screenshot labels were reviewed by
          Claude at the owner&apos;s request, not by an independent human.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ what optimus does */

const PIPELINE: { id: (typeof AGENTS)[number]["id"]; title: string; text: string }[] = [
  { id: "contract", title: "Write the contract", text: "Describe what to do in the app and what to record. Expected answers stay with Optimus — the browser agent never sees them." },
  { id: "runner", title: "Kane runs every build", text: "Kane CLI performs each step in a real browser, on every build, and records what it sees." },
  { id: "evidence", title: "Evidence, not opinions", text: "Recorded values and end-of-step screenshots. Missing evidence stays missing — nothing is guessed." },
  { id: "verdict", title: "Optimus decides", text: "Deterministic checks give PASS or FAIL. Not enough evidence gives no judgement — never a fail." },
  { id: "smith", title: "Repair, then re-check", text: "A verified FAIL can go to a coding agent. A fresh Kane run with the same contract checks the fix." },
];

export function WhatItDoes({ data }: { data: SiteData }) {
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-24 bg-paper">
      <div className="mx-auto max-w-[1440px] px-4 py-24 md:px-16">
        <Reveal className="max-w-[760px]">
          <p className="label-mono text-ink-muted">What Optimus does</p>
          <h2 id="how-title" className="headline mt-4">
            Describe the behaviour once. <span className="text-ink-muted">Check every build the same way.</span>
          </h2>
          <p className="mt-6">
            Optimus checks whether web apps behave as required — any app, any behaviour you can describe as steps in a
            browser. It is built for comparing many independent builds of the same thing, such as every submission to an
            assignment: one contract, applied unchanged, with a verdict you can trace back to evidence.
          </p>
        </Reveal>
        <Stagger className="mt-12 grid grid-cols-1 border-t border-rule md:grid-cols-5" gap={0.1}>
          {PIPELINE.map((step, i) => {
            const agent = AGENTS.find((a) => a.id === step.id)!;
            return (
              <StaggerItem key={step.id} className={cn("flex flex-col gap-4 border-b border-rule py-8 md:border-b-0 md:px-6", i > 0 && "md:border-l")}>
                <span
                  aria-hidden="true"
                  className="pixelated block h-24 bg-no-repeat"
                  style={{
                    width: `${(agent.frameW / agent.frameH) * 96}px`,
                    backgroundImage: `url(${agent.sprite})`,
                    backgroundSize: "200% 100%",
                  }}
                />
                <p className="font-mono text-ink-muted">0{i + 1}</p>
                <h3 className="font-extrabold">{step.title}</h3>
                <p className="text-ink-muted">{step.text}</p>
              </StaggerItem>
            );
          })}
        </Stagger>
        <Reveal className="mt-12 flex flex-col gap-4 border-l-4 border-lime bg-paper-2 p-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-[80ch]">
            <span className="font-extrabold">The example on this page:</span> a {data.assessmentName.replace(/ assessment$/i, "")} assignment — a
            small book-list app — built {words(data.matrix.length)} different ways (vanilla JavaScript, React, two builds
            with planted bugs, and a blind build whose bug stayed sealed until grading), judged by one contract with {data.scope.length} scenarios: {data.scope.map((s) => s.name).join(", ")}. Optimus is not
            library-specific: the same engine runs any contract, and a calculator contract is part of its test suite.
          </p>
          <a href="/report/" className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-full bg-charcoal px-5 font-extrabold text-paper hover:bg-ink md:self-auto">
            Open the example report <ArrowRight aria-hidden="true" weight="bold" className="size-4" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 1.0 contract */

/** "After "<step action>", <prompt> should <rule>" → { step, rule }, read from the real check text. */
function compactCheck(text: string, steps: { stepId: string; action: string }[]) {
  const step = steps.find((s) => text.startsWith(`After "${s.action}"`));
  const at = text.lastIndexOf(" should ");
  if (!step || at < 0) return null;
  return { stepId: step.stepId, rule: text.slice(at + 1).replace(/\.$/, "") };
}

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
        <div className="flex flex-col gap-4">
          <p className="flex flex-wrap items-center gap-2">
            <ExampleTag />
            <span className="text-ink-muted">
              scenario <span className="font-mono">{s.id}</span>: {s.title.replace(/^Scenario \w+: /, "")}
            </span>
          </p>
          <Stagger className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2" gap={0.18}>
            <StaggerItem from="left" className="h-full rounded-sm border border-rule bg-white p-4">
              <p className="label-mono text-ink-muted">Sent to Kane</p>
              <ol className="mt-3 flex flex-col gap-3">
                {s.sentToKane.steps.map((step) => (
                  <li key={step.stepId}>
                    <span className="font-mono text-ink-muted">{step.stepId}</span>
                    <p>{step.action}</p>
                    {Object.keys(step.record).length > 0 && (
                      <p className="font-mono text-ink-muted [overflow-wrap:anywhere]">record: {Object.keys(step.record).join(", ")}</p>
                    )}
                  </li>
                ))}
              </ol>
            </StaggerItem>
            <StaggerItem from="up" className="h-full rounded-sm border border-dashed border-charcoal/40 bg-paper-2 p-4">
              <p className="label-mono text-ink-muted">Judged by Optimus — never sent</p>
              <ul className="mt-3 flex flex-col gap-3">
                {s.judgedByOptimus.checks.map((c) => {
                  const short = compactCheck(c.text, s.sentToKane.steps);
                  return (
                    <li key={c.text} className="[overflow-wrap:anywhere]">
                      {short ? (
                        <>
                          <span className="font-mono text-ink-muted">
                            after {short.stepId}
                            {c.prerequisite && " · prerequisite"}
                          </span>
                          <p>
                            <span className="font-mono font-extrabold">{c.recording}</span> {short.rule}
                          </p>
                        </>
                      ) : (
                        <p>{c.text}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </StaggerItem>
          </Stagger>
          <p className="text-ink-muted">
            <span className="font-mono">{"{{nonce}}"}</span> is filled with a fresh run id each time; the hash covers the unexpanded contract.
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
          <figcaption className="flex flex-col gap-2">
            <ExampleTag />
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <span className="font-extrabold">{e.buildLabel}</span> · {e.scenarioName} (<span className="font-mono">{e.scenarioId}</span>)
              </span>
              <VerdictBadge verdict={e.verdict} />
            </span>
          </figcaption>
          <Stagger className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2" gap={0.15}>
            {shots.map((s) => (
              <StaggerItem key={s.stepId}>
                {/* the archived frame is a full 16:9 browser window; crop in on the app itself */}
                <a href={`/report/${s.screenshot}`} className="block aspect-[4/3] overflow-hidden rounded-sm border border-rule bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/report/${s.screenshot}`}
                    alt={`End-of-step screenshot after: ${s.action}`}
                    loading="lazy"
                    className="w-full origin-[50%_0%] scale-[1.9] text-[0px]"
                  />
                </a>
                <p className="mt-2">{s.action}</p>
                <dl className="mt-2 flex flex-col gap-1 font-mono">
                  {Object.entries(s.values).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-3">
                      <dt className="text-ink-muted [overflow-wrap:anywhere]">{k}</dt>
                      <dd>
                        <RecordedValue value={v} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </StaggerItem>
            ))}
          </Stagger>
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
            In the example, {words(data.matrix.length)} builds of the same Library assignment — vanilla JavaScript, React,
            two with planted bugs and one blind build — are judged by one contract. Each verdict comes from Optimus&apos;s deterministic checks. A repaired build
            keeps its baseline verdict next to the verified one; history is never overwritten.
          </p>
        </Reveal>
        {/* the real report, framed over the observatory; only the window animates, the scene stays put */}
        <div className="relative mt-12 overflow-hidden rounded-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/scene/H-01-plate.png" alt="" aria-hidden="true" loading="lazy" className="pixelated absolute inset-0 size-full object-cover" />
          <div className="relative p-4 sm:p-8 lg:p-12">
            <Reveal className="mx-auto max-w-[960px] rounded-sm border border-white/60 bg-paper/95 p-4 backdrop-blur-md sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-4">
                <p className="flex flex-wrap items-center gap-2 font-extrabold">
                  {data.assessmentName} <ExampleTag>example</ExampleTag>
                </p>
                <p className="font-mono text-ink-muted [overflow-wrap:anywhere]">
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
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 4.0 repair */

export function RepairChapter({ data }: { data: SiteData }) {
  const r = data.repair;
  if (!r) return null;
  const diffLines = r.diff.split("\n").filter((l) => !l.startsWith("index "));
  const label = (
    <span>
      {r.scenarioName} (<span className="font-mono">{r.scenarioId}</span>)
    </span>
  );
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
      <Stagger className="flex min-w-0 flex-col gap-4" gap={0.12}>
        <StaggerItem from="left" className="rounded-sm border border-white/25 bg-azure-ink/40 p-4">
          <p className="flex flex-wrap items-center gap-2">
            <ExampleTag dark />
          </p>
          <p className="label-mono mt-3 text-white/75">Baseline · {r.buildLabel}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            {label} <VerdictBadge verdict={r.baseline} />
          </p>
        </StaggerItem>
        <StaggerItem from="left" className="rounded-sm border border-dashed border-lime/70 bg-azure-ink/40 p-4">
          <p className="label-mono text-lime">Sent to the coding agent{r.agent ? ` · ${r.agent}` : ""}</p>
          <p className="mt-2 [overflow-wrap:anywhere]">{r.requirement}</p>
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 font-mono">
            <dt className="text-white/70">expected</dt>
            <dd className="[overflow-wrap:anywhere]">{r.expected}</dd>
            <dt className="text-white/70">observed</dt>
            <dd className="[overflow-wrap:anywhere]">{r.observed}</dd>
          </dl>
        </StaggerItem>
        <StaggerItem from="left" className="min-w-0 rounded-sm border border-white/25 bg-azure-ink/60 p-4">
          <p className="label-mono text-white/75">Code change · {r.changedFiles.join(", ")}</p>
          <pre className="mt-3 max-h-96 overflow-auto font-mono text-[1rem] leading-6">
            {diffLines.map((line, i) => (
              <span
                key={i}
                className={cn(
                  "block w-max min-w-full pr-4 whitespace-pre",
                  line.startsWith("+") && !line.startsWith("+++") && "bg-[#1f5c2e] text-[#e3ffe8]",
                  line.startsWith("-") && !line.startsWith("---") && "bg-[#6b1f1f] text-[#ffe6e6]",
                  line.startsWith("@@") && "text-white/60",
                )}
              >
                {line || " "}
              </span>
            ))}
          </pre>
        </StaggerItem>
        <StaggerItem from="left" className="rounded-sm border border-white/25 bg-azure-ink/40 p-4">
          <p className="label-mono text-white/75">Integrity checks</p>
          <ul className="mt-2 flex flex-col gap-1">
            {r.integrity.map((c) => (
              <li key={c.label} className="flex items-start gap-2">
                {c.ok ? <CheckCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-lime" /> : <WarningCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#ffb4a8]" />}
                {c.label}
                <span className="sr-only">{c.ok ? "passed" : "problem"}</span>
              </li>
            ))}
          </ul>
        </StaggerItem>
        <StaggerItem from="left" className="rounded-sm border border-white/25 bg-azure-ink/40 p-4">
          <p className="label-mono text-white/75">Fresh Kane run · same contract</p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            {label} <VerdictBadge verdict={r.latest} />
          </p>
          <p className="mt-2 text-white/80">
            {r.outcome} {r.attempts} attempt · {r.creditsUsed !== null ? `${r.creditsUsed.toFixed(2)} credits` : "credits not recorded"} ·{" "}
            {r.minutes.toFixed(2)} min of agent time.
          </p>
        </StaggerItem>
      </Stagger>
    </Chapter>
  );
}

/* ------------------------------------------------------------------ docs teaser */

const DOCS = [
  { n: "I", title: "Write a contract", href: "/docs/#library-contract-versions" },
  { n: "II", title: "Run Kane on a build", href: "/docs/#4-run-a-live-browser-evaluation" },
  { n: "III", title: "Read the verdicts", href: "/docs/#3-evaluate-evidence-offline" },
  { n: "IV", title: "Close the repair loop", href: "/docs/#automated-repair-loop" },
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
        <Stagger className="mt-12 grid grid-cols-1 border-t border-rule md:grid-cols-4" gap={0.1}>
          {DOCS.map((d, i) => (
            <StaggerItem key={d.n} className={cn("border-b border-rule md:border-b-0", i > 0 && "md:border-l")}>
              <a href={d.href} className="group flex h-full flex-col gap-8 p-6 transition-colors hover:bg-paper">
                <span className="font-mono text-ink-muted">Chapter {d.n}</span>
                <span className="flex items-end justify-between gap-4 font-display text-[1.5rem] leading-8 font-extrabold">
                  {d.title}
                  <ArrowRight aria-hidden="true" className="size-6 shrink-0 transition-transform group-hover:translate-x-1" />
                </span>
              </a>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ footer */

export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-12 md:flex-row md:items-start md:justify-between md:px-16">
        <div>
          <Logo markClassName="size-8" />
          <p className="mt-2 max-w-[40ch] text-paper/75">Evidence-backed behavioural verdicts for web apps. Built during the Kane CLI hackathon, 2026.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2">
          <Link className="hover:underline" href="/#how">How it works</Link>
          <a className="hover:underline" href="/report/">Example report</a>
          <Link className="hover:underline" href="/#verdicts">Verdicts</Link>
          <a className="hover:underline" href="/docs/">Docs</a>
          <Link className="hover:underline" href="/#repair">Repair loop</Link>
          <a className="hover:underline" href="https://github.com/LambdaTest/kane-cli">Kane CLI</a>
          <a className="hover:underline" href={REPO_URL}>GitHub</a>
        </nav>
      </div>
      <p className="mx-auto max-w-[1440px] px-4 pb-8 text-paper/60 md:px-16">
        Pixel art: original Optimus asset set, generated for this project. Kane CLI is a product of TestMu AI.
      </p>
    </footer>
  );
}
