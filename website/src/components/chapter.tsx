import type { ReactNode } from "react";
import { cn } from "cn";
import { Reveal } from "@/components/motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface ChapterPoint {
  title: string;
  body: ReactNode;
}

/**
 * Numbered chapter: mono label, two-tone light headline, lead paragraph, numbered accordion rows,
 * then the chapter's real-data panel and its pixel-art vignette.
 */
export function Chapter({
  id,
  number,
  label,
  title,
  titleMuted,
  lead,
  points,
  art,
  artAlt,
  children,
  tone = "paper",
}: {
  id: string;
  number: string;
  label: string;
  title: string;
  titleMuted: string;
  lead: ReactNode;
  points: ChapterPoint[];
  art: string;
  artAlt: string;
  children: ReactNode;
  tone?: "paper" | "azure";
}) {
  const dark = tone === "azure";
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24", dark ? "on-dark bg-azure-deep text-white" : "bg-paper text-ink")}>
      <div className="mx-auto max-w-[1440px] px-4 py-24 md:px-16 md:py-32">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
          <Reveal className="self-start lg:sticky lg:top-28">
            <p className={cn("label-mono", dark ? "text-white/75" : "text-ink-muted")}>
              {number} — {label}
            </p>
            <h2 id={`${id}-title`} className="headline mt-4">
              {title} <span className={dark ? "text-white/70" : "text-ink-muted"}>{titleMuted}</span>
            </h2>
            <div className={cn("mt-6 max-w-[60ch]", dark ? "text-white/90" : "text-ink")}>{lead}</div>
            <Accordion type="single" collapsible className={cn("mt-8 border-t", dark ? "border-white/20" : "border-rule")}>
              {points.map((p, i) => (
                <AccordionItem key={p.title} value={p.title} className={dark ? "border-white/20" : "border-rule"}>
                  <AccordionTrigger className="py-4 text-base hover:no-underline">
                    <span className="flex gap-4">
                      <span className={cn("font-mono", dark ? "text-white/70" : "text-ink-muted")}>
                        {number.split(".")[0]}.{i + 1}
                      </span>
                      <span className="font-extrabold">{p.title}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className={cn("pb-6 text-base", dark ? "text-white/90" : "text-ink")}>{p.body}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
          <Reveal delay={0.08} className="flex flex-col gap-8">
            {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must not be resampled */}
            <img
              src={art}
              alt={artAlt}
              loading="lazy"
              decoding="async"
              width={320}
              height={185}
              className="pixelated aspect-[320/185] w-full rounded-sm border border-black/10 object-cover"
            />
            {children}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
