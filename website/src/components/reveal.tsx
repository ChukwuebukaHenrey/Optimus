"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Motion entrance and scroll reveals. Every animated element carries data-reveal, and the layout's
 * <noscript> rule shows it fully when JavaScript is off, so text is never stuck invisible.
 * Reduced motion is handled by <MotionConfig reducedMotion="user"> in the layout.
 */
const ease = [0.22, 1, 0.36, 1] as const;
const OFFSETS = { up: { x: 0, y: 24 }, left: { x: -32, y: 0 }, right: { x: 32, y: 0 }, none: { x: 0, y: 0 } };
export type Direction = keyof typeof OFFSETS;

export function Reveal({
  children,
  className,
  delay = 0,
  from = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: Direction;
}) {
  return (
    <motion.div
      data-reveal
      className={className}
      initial={{ opacity: 0, ...OFFSETS[from] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.55, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

/** A list whose children arrive one after another when it scrolls into view. */
export function Stagger({ children, className, gap = 0.08 }: { children: ReactNode; className?: string; gap?: number }) {
  return (
    <motion.div
      data-reveal
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, from = "up" }: { children: ReactNode; className?: string; from?: Direction }) {
  return (
    <motion.div
      data-reveal
      className={className}
      variants={{
        hidden: { opacity: 0, ...OFFSETS[from] },
        shown: { opacity: 1, x: 0, y: 0, transition: { duration: 0.5, ease } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Hero copy entrance: children rise and fade in, staggered, once on load. */
export function Entrance({ children, className, start = 0 }: { children: ReactNode; className?: string; start?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="shown"
      variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.07, delayChildren: 0.1 + start * 0.07 } } }}
    >
      {children}
    </motion.div>
  );
}

export function EntranceItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      data-reveal
      className={className}
      variants={{ hidden: { opacity: 0, y: 10 }, shown: { opacity: 1, y: 0, transition: { duration: 0.45, ease } } }}
    >
      {children}
    </motion.div>
  );
}
