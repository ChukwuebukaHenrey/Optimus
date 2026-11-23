import { CheckCircle, MinusCircle, Plugs, Prohibit, Question, XCircle } from "@phosphor-icons/react/dist/ssr";
import { cn } from "cn";
import type { Verdict } from "@/lib/bundle";

/**
 * Verdict colours live only here. INCONCLUSIVE, NOT_RUN and INFRA_ERROR mean "no judgement" and
 * never look like a failure: different hue, different border style, different icon.
 */
const STYLES: Record<Verdict, { label: string; className: string; Icon: typeof CheckCircle }> = {
  PASS: { label: "PASS", className: "bg-[var(--pass-bg)] text-[var(--pass-fg)] border-2 border-solid border-[var(--pass-fg)]/30", Icon: CheckCircle },
  FAIL: { label: "FAIL", className: "bg-[var(--fail-bg)] text-[var(--fail-fg)] border-l-4 border-solid border-[var(--fail-fg)]", Icon: XCircle },
  INCONCLUSIVE: { label: "INCONCLUSIVE", className: "bg-[var(--inconc-bg)] text-[var(--inconc-fg)] border-2 border-dashed border-[var(--inconc-fg)]/50", Icon: Question },
  NOT_RUN: { label: "NOT RUN", className: "bg-[var(--neutral-bg)] text-[var(--neutral-fg)] border-2 border-dotted border-[var(--neutral-fg)]/50", Icon: MinusCircle },
  INFRA_ERROR: { label: "INFRA ERROR", className: "bg-[var(--neutral-bg)] text-[var(--neutral-fg)] border-[3px] border-double border-[var(--neutral-fg)]/60", Icon: Plugs },
  UNSUPPORTED: { label: "UNSUPPORTED", className: "bg-transparent text-[var(--neutral-fg)] border border-solid border-[var(--neutral-fg)]/50", Icon: Prohibit },
};

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const { label, className: tone, Icon } = STYLES[verdict];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono font-extrabold tracking-wide whitespace-nowrap", tone, className)}>
      <Icon aria-hidden="true" weight="regular" className="size-4 shrink-0" />
      {label}
    </span>
  );
}
