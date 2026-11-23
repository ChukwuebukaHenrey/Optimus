"use client";

import { ArrowUpRight, CheckCircle } from "@phosphor-icons/react";
import { cn } from "cn";
import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import puzzle from "@/content/word-search.json";

type Cell = [number, number];
const key = ([r, c]: Cell) => `${r}-${c}`;
const SIZE = puzzle.size;
/** The button for a cell; only called from event handlers, never during render. */
const cellButton = (c: Cell) => document.querySelector<HTMLButtonElement>(`#find [data-cell="${key(c)}"]`);

/** Cells on the straight line from a to b, or null if a and b are not on one row, column or diagonal. */
function line(a: Cell, b: Cell): Cell[] | null {
  const dr = b[0] - a[0];
  const dc = b[1] - a[1];
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const n = Math.max(Math.abs(dr), Math.abs(dc));
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + sr * i, a[1] + sc * i] as Cell);
}

export function WordSearch() {
  const [found, setFound] = useState<string[]>([]);
  const [start, setStart] = useState<Cell | null>(null);
  const [hover, setHover] = useState<Cell | null>(null);
  const [focus, setFocus] = useState<Cell>([0, 0]);
  const [status, setStatus] = useState("");
  const dragging = useRef(false);

  const foundCells = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of puzzle.words) if (found.includes(w.word)) for (const c of w.cells) m.set(key(c as Cell), w.word);
    return m;
  }, [found]);

  const selection = useMemo(() => {
    if (!start) return new Set<string>();
    const path = hover ? line(start, hover) : [start];
    return new Set((path ?? [start]).map(key));
  }, [start, hover]);

  const finish = useCallback(
    (a: Cell, b: Cell) => {
      const path = line(a, b);
      setStart(null);
      setHover(null);
      if (!path || path.length < 2) return;
      const ks = path.map(key).join("|");
      const match = puzzle.words.find((w) => {
        const forward = w.cells.map((c) => key(c as Cell));
        return forward.join("|") === ks || [...forward].reverse().join("|") === ks;
      });
      if (!match) {
        setStatus(`${path.map(([r, c]) => puzzle.grid[r][c]).join("")} is not one of the words. Try again.`);
        return;
      }
      if (found.includes(match.word)) {
        setStatus(`${match.word} is already found.`);
        return;
      }
      const next = [...found, match.word];
      setFound(next);
      setStatus(
        next.length === puzzle.words.length
          ? `Found ${match.word}. All ${puzzle.words.length} words found.`
          : `Found ${match.word}. Its link, ${match.label}, is in the list. ${puzzle.words.length - next.length} to go.`,
      );
    },
    [found],
  );

  const cellAt = (x: number, y: number): Cell | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-cell]");
    if (!el) return null;
    const [r, c] = el.dataset.cell!.split("-").map(Number);
    return [r, c];
  };

  // Pointer: a drag selects from where it began; a tap starts a selection, a second tap finishes it.
  const origin = useRef<Cell | null>(null);
  const tapStart = useRef<Cell | null>(null);
  const moved = useRef(false);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const c = cellAt(e.clientX, e.clientY);
    if (!c) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    moved.current = false;
    origin.current = c;
    tapStart.current = start;
    if (!start) setStart(c);
    setHover(c);
    setFocus(c);
    // preventDefault above stops the browser focusing the letter; focus it so the keyboard can continue
    cellButton(c)?.focus({ preventScroll: true });
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !origin.current) return;
    const c = cellAt(e.clientX, e.clientY);
    if (!c) return;
    if (!moved.current && key(c) !== key(origin.current)) {
      moved.current = true;
      setStart(origin.current);
    }
    setHover(c);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !origin.current) return;
    dragging.current = false;
    const c = cellAt(e.clientX, e.clientY) ?? hover ?? origin.current;
    if (moved.current) {
      finish(origin.current, c);
    } else if (tapStart.current) {
      if (key(tapStart.current) === key(c)) {
        setStart(null);
        setHover(null);
        setStatus("Selection cleared.");
      } else {
        finish(tapStart.current, c);
      }
    } else {
      setStatus(`Start: ${puzzle.grid[c[0]][c[1]]} at row ${c[0] + 1}, column ${c[1] + 1}. Now choose the last letter.`);
    }
    origin.current = null;
  };

  const moveFocus = (r: number, c: number) => {
    const next: Cell = [Math.max(0, Math.min(SIZE - 1, r)), Math.max(0, Math.min(SIZE - 1, c))];
    setFocus(next);
    if (start) setHover(next);
    cellButton(next)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, cell: Cell) => {
    const [r, c] = cell;
    const moves: Record<string, Cell> = { ArrowUp: [r - 1, c], ArrowDown: [r + 1, c], ArrowLeft: [r, c - 1], ArrowRight: [r, c + 1] };
    if (moves[e.key]) {
      e.preventDefault();
      moveFocus(...moves[e.key]);
    } else if (e.key === "Home") {
      e.preventDefault();
      moveFocus(r, 0);
    } else if (e.key === "End") {
      e.preventDefault();
      moveFocus(r, SIZE - 1);
    } else if (e.key === "Escape" && start) {
      setStart(null);
      setHover(null);
      setStatus("Selection cleared.");
    }
  };

  const onActivate = (cell: Cell) => {
    if (!start) {
      setStart(cell);
      setHover(cell);
      setStatus(`Start: row ${cell[0] + 1}, column ${cell[1] + 1}, letter ${puzzle.grid[cell[0]][cell[1]]}. Choose the last letter.`);
    } else if (key(start) === key(cell)) {
      setStart(null);
      setHover(null);
      setStatus("Selection cleared.");
    } else {
      finish(start, cell);
    }
  };

  return (
    <section id="find" aria-labelledby="find-title" className="scroll-mt-24 bg-[#e6eedd]">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-24 md:px-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="label-mono text-ink-muted">Find your way</p>
          <h2 id="find-title" className="headline mt-4">
            Six words. <span className="text-ink-muted">Each one is a door.</span>
          </h2>
          <p className="mt-6 max-w-[56ch]">
            Drag across a word, or select its first and last letters. With a keyboard, move with the arrow keys and press
            Enter on the first and last letter. Words run in straight lines, in any direction. You never have to solve it:
            every link is in the list.
          </p>
          <div
            role="group"
            aria-label="Word search, 12 by 12 letters"
            className="mt-8 grid w-full max-w-[528px] touch-none grid-cols-12 border-2 border-ink/80 bg-paper p-1 select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              dragging.current = false;
              setStart(null);
              setHover(null);
            }}
          >
            {puzzle.grid.map((row, r) =>
              [...row].map((letter, c) => {
                const k = key([r, c]);
                const isFound = foundCells.has(k);
                const isSel = selection.has(k);
                const isFocus = focus[0] === r && focus[1] === c;
                return (
                  <button
                    key={k}
                    type="button"
                    data-cell={k}
                    tabIndex={isFocus ? 0 : -1}
                    aria-label={`${letter}, row ${r + 1}, column ${c + 1}${isFound ? `, part of ${foundCells.get(k)}` : ""}${isSel ? ", selected" : ""}`}
                    aria-pressed={isSel}
                    onKeyDown={(e) => onKeyDown(e, [r, c])}
                    onClick={(e) => {
                      // keyboard activation only (detail 0); pointer taps are handled on the grid
                      if (e.detail === 0) onActivate([r, c]);
                    }}
                    onFocus={() => setFocus([r, c])}
                    className={cn(
                      "aspect-square font-mono text-[1rem] leading-none font-extrabold transition-colors",
                      isFound ? "bg-lime text-ink" : "text-ink",
                      isSel && "bg-azure-deep text-white",
                      !isFound && !isSel && "hover:bg-paper-2",
                    )}
                  >
                    {letter}
                  </button>
                );
              }),
            )}
          </div>
          <p aria-live="polite" className="mt-4 min-h-6 text-ink">
            {status}
          </p>
        </div>

        <div className="lg:pt-16">
          <p className="font-extrabold">The six doors</p>
          <ul className="mt-4 border-t border-ink/20">
            {puzzle.words.map((w) => {
              const done = found.includes(w.word);
              return (
                <li key={w.word} className="border-b border-ink/20">
                  <a href={w.href} className="group flex items-center justify-between gap-4 py-4">
                    <span className="flex items-center gap-3">
                      <span className="w-24 font-mono font-extrabold tracking-wider">{w.word}</span>
                      <span className="text-ink-muted">{w.label}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {done && (
                        <>
                          <CheckCircle aria-hidden="true" weight="fill" className="size-5 text-[var(--pass-fg)]" />
                          <span className="sr-only">found</span>
                        </>
                      )}
                      <ArrowUpRight aria-hidden="true" className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-ink-muted">
            {found.length} of {puzzle.words.length} found.
          </p>
        </div>
      </div>
    </section>
  );
}
