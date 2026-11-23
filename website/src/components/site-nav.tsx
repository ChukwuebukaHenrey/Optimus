"use client";

import { ArrowRight, List, X } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "cn";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const CHAPTERS = [
  { href: "/#contract", label: "How it works" },
  { href: "/#evidence", label: "Evidence" },
  { href: "/#verdicts", label: "Verdicts" },
  { href: "/#repair", label: "Repair" },
];
const DOCS = { href: "/docs/", label: "Docs" };
const CTA = { href: "/report/", label: "See a real report" };

function Wordmark({ onDark }: { onDark: boolean }) {
  return (
    <a href="/#top" className="flex items-center gap-2 rounded-sm" aria-label="Optimus, back to top">
      <svg viewBox="0 0 4 4" shapeRendering="crispEdges" className="size-5" aria-hidden="true">
        <rect x="1" y="0" width="2" height="1" fill={onDark ? "#fff" : "var(--ink)"} />
        <rect x="0" y="1" width="1" height="2" fill={onDark ? "#fff" : "var(--ink)"} />
        <rect x="3" y="1" width="1" height="2" fill={onDark ? "#fff" : "var(--ink)"} />
        <rect x="1" y="3" width="2" height="1" fill={onDark ? "#fff" : "var(--ink)"} />
        <rect x="1" y="1" width="2" height="2" fill="var(--lime)" />
      </svg>
      <span className={cn("font-display text-[1.5rem] leading-none font-extrabold tracking-tight", onDark ? "text-white" : "text-ink")}>
        Optimus
      </span>
    </a>
  );
}

/** Over the hero: glass on sky. Past the hero: paper glass with ink text and a charcoal CTA. */
export function SiteNav({ overHero = true }: { overHero?: boolean }) {
  const [scrolled, setScrolled] = useState(!overHero);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!overHero) return;
    const hero = document.getElementById("top");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { rootMargin: "-72px 0px 0px 0px" });
    io.observe(hero);
    return () => io.disconnect();
  }, [overHero]);

  const onDark = !scrolled;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
        scrolled ? "border-b border-rule bg-[var(--paper-glass)] backdrop-blur-md" : "bg-transparent",
      )}
    >
      <nav aria-label="Main" className={cn("mx-auto flex h-18 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-16", onDark && "on-dark")}>
        <Wordmark onDark={onDark} />

        <div className="hidden items-center gap-2 lg:flex">
          <ul className={cn("flex h-11 items-center rounded-full px-2", onDark ? "glass" : "border border-rule bg-paper-2")}>
            {CHAPTERS.map((c) => (
              <li key={c.href}>
                <a
                  href={c.href}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full px-4 transition-colors",
                    onDark ? "text-white hover:bg-white/15" : "text-ink hover:bg-paper",
                  )}
                >
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href={DOCS.href}
            className={cn(
              "inline-flex h-11 items-center rounded-full px-5 transition-colors",
              onDark ? "glass text-white hover:bg-[rgb(6_33_61/0.5)]" : "border border-rule bg-paper-2 text-ink hover:bg-paper",
            )}
          >
            {DOCS.label}
          </a>
          <a
            href={CTA.href}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-full px-5 font-extrabold transition-colors",
              onDark ? "bg-paper text-ink hover:bg-white" : "bg-charcoal text-paper hover:bg-ink",
            )}
          >
            {CTA.label}
          </a>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-sm lg:hidden",
              onDark ? "glass text-white" : "border border-rule bg-paper-2 text-ink",
            )}
            aria-label="Open menu"
          >
            <List aria-hidden="true" className="size-6" />
          </DialogTrigger>
          <DialogContent
            showCloseButton={false}
            className="on-dark inset-0 top-0 left-0 flex h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-azure-deep p-0 text-white shadow-none sm:max-w-none data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100"
          >
            <MenuLines />
            <div className="relative flex h-18 items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
              <Wordmark onDark />
              <DialogClose
                className="inline-flex size-11 items-center justify-center rounded-sm border-[1.5px] border-lime text-white"
                aria-label="Close menu"
              >
                <X aria-hidden="true" className="size-6" />
              </DialogClose>
            </div>
            <DialogTitle className="sr-only">Menu</DialogTitle>
            <DialogDescription className="sr-only">Sections of the Optimus site</DialogDescription>
            <ul className="relative mt-8 flex flex-col gap-2 px-4">
              {[...CHAPTERS, DOCS].map((c, i) => (
                <motion.li
                  key={c.href}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                >
                  <a
                    href={c.href}
                    onClick={() => setOpen(false)}
                    className="headline block rounded-sm py-1 text-white"
                  >
                    {c.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            <div className="relative mt-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
              <a
                href={CTA.href}
                onClick={() => setOpen(false)}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-paper font-extrabold text-ink"
              >
                {CTA.label}
                <ArrowRight aria-hidden="true" weight="bold" className="size-4" />
              </a>
              <p className="label-mono mt-6 text-white/75">Built for the Kane CLI hackathon</p>
            </div>
          </DialogContent>
        </Dialog>
      </nav>
    </header>
  );
}

/** Thin pixel-step lines behind the mobile menu. */
function MenuLines() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 100 200">
      <path
        d="M-5 150 H20 V130 H45 V112 H70 V96 H105 M-5 182 H30 V166 H60 V150 H105 M60 -5 V20 H76 V40 H92 V62 H105"
        fill="none"
        stroke="white"
        strokeOpacity="0.12"
        strokeWidth="0.4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
