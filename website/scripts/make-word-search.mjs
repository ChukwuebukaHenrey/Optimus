// Generate the footer word search: a 12x12 grid with six words placed in straight lines
// (horizontal, vertical or diagonal, forwards or backwards) and their saved solution paths.
// Deterministic (fixed seed), so the committed JSON only changes when this file changes.
//   node website/scripts/make-word-search.mjs
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 12;
const WORDS = [
  { word: "CONTRACT", href: "#contract", label: "The contract" },
  { word: "EVIDENCE", href: "#evidence", label: "The evidence" },
  { word: "VERIFY", href: "#verdicts", label: "The verdicts" },
  { word: "REPAIR", href: "#repair", label: "The repair loop" },
  { word: "BUILD", href: "/report/", label: "Every build, one report" },
  { word: "KANE", href: "https://github.com/LambdaTest/kane-cli", label: "Kane CLI" },
];
const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];

let seed = 20261126;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

function attempt() {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const placed = [];
  for (const { word, href, label } of [...WORDS].sort((a, b) => b.word.length - a.word.length)) {
    let ok = false;
    for (let tries = 0; tries < 400 && !ok; tries++) {
      const [dr, dc] = DIRS[Math.floor(rand() * DIRS.length)];
      const r0 = Math.floor(rand() * SIZE);
      const c0 = Math.floor(rand() * SIZE);
      const cells = [...word].map((_, i) => [r0 + dr * i, c0 + dc * i]);
      if (cells.some(([r, c]) => r < 0 || c < 0 || r >= SIZE || c >= SIZE)) continue;
      if (cells.some(([r, c], i) => grid[r][c] !== null && grid[r][c] !== word[i])) continue;
      cells.forEach(([r, c], i) => (grid[r][c] = word[i]));
      placed.push({ word, href, label, cells });
      ok = true;
    }
    if (!ok) return null;
  }
  const filler = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const row of grid) for (let c = 0; c < SIZE; c++) row[c] ??= filler[Math.floor(rand() * filler.length)];
  // Every word must appear exactly once in any direction, so the saved solution is the only one.
  for (const { word } of WORDS) if (occurrences(grid, word) !== 1) return null;
  return { grid: grid.map((row) => row.join("")), words: WORDS.map((w) => placed.find((p) => p.word === w.word)) };
}

function occurrences(grid, word) {
  let n = 0;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      for (const [dr, dc] of DIRS) {
        let i = 0;
        while (i < word.length) {
          const rr = r + dr * i, cc = c + dc * i;
          if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE || grid[rr][cc] !== word[i]) break;
          i++;
        }
        if (i === word.length) n++;
      }
  return n;
}

let puzzle = null;
while (!puzzle) puzzle = attempt();
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "content", "word-search.json");
writeFileSync(out, JSON.stringify({ size: SIZE, ...puzzle }, null, 2) + "\n");
console.log(puzzle.grid.join("\n"));
