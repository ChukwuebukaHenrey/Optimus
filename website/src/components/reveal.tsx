import type { CSSProperties, ReactNode } from "react";
import { cn } from "cn";

/**
 * Entrance and scroll-reveal effects as pure CSS (globals.css: .rise, .reveal). Content is visible
 * without JavaScript: the effects are progressive enhancement and never gate the text.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string; delay?: number }) {
  return <div className={cn("reveal", className)}>{children}</div>;
}

/** Hero copy entrance: children rise 8px and fade in, staggered, once on load. */
export function Entrance({ children, className, start = 0 }: { children: ReactNode; className?: string; start?: number }) {
  return (
    <div className={cn("entrance", className)} style={{ "--rise-start": start } as CSSProperties}>
      {children}
    </div>
  );
}

export function EntranceItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rise", className)}>{children}</div>;
}
