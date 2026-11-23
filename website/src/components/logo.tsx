import { cn } from "cn";

import { MARK_PATH, MARK_VIEWBOX } from "../../../src/report/mark";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox={MARK_VIEWBOX} className={cn("shrink-0", className)} aria-hidden="true" focusable="false">
      <path d={MARK_PATH} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

/** Mark plus the word "Optimus" set in the display face (live text, so it scales and stays accessible). */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark className={cn("size-7", markClassName)} />
      <span className="font-display text-[1.5rem] leading-none font-extrabold tracking-tight">Optimus</span>
    </span>
  );
}
