/**
 * Optimus demo video: the single config file.
 *
 * Source of truth for the content: docs/video/DEMO_VIDEO_BRIEF.md (owner's brief; it wins on any conflict).
 * Everything revision-prone lives here: canvas, the `footage` switch, approved facts, scene timings,
 * on-screen copy, voiceover lines, motion tokens, colours, fonts, recordings and audio.
 * Changing a number ("11 → 12") or a scene length is a data change in this file only.
 *
 * Status: storyboard timings are PROVISIONAL starting values (brief §7). Re-cut them to the rough
 * voiceover read (brief §2), then lock. `npm run check` validates this file; the Studio refuses
 * to load an invalid config.
 *
 * Paths: `sources` and `archivedFallback` are relative to the repository root; `file` paths are
 * relative to video/public (served with staticFile()).
 */

// ---------------------------------------------------------------------------------------------
// Canvas (brief §1 [FORMATS], §4)
// ---------------------------------------------------------------------------------------------

export const VIDEO = {
  id: "OptimusDemo",
  width: 1920,
  height: 1080,
  fps: 60,
  /** Hard ceiling: 2:52 = 172 s (8 s margin under the 3:00 hackathon maximum). */
  maxSeconds: 172,
} as const;

/** Seconds → frames at the composition frame rate. */
export const s = (seconds: number): number => Math.round(seconds * VIDEO.fps);

// ---------------------------------------------------------------------------------------------
// The footage switch (brief §5 safeguard 4, §7)
// One value decides scene 4's label, narration, captions and evidence references together.
// 'live'     → the new R1 recording of `optimus repair` on build U (not recorded yet).
// 'archived' → the archived session runs/repair-u (always labelled "archived run" on screen).
// Never blend the two runs' screenshots or numbers.
// ---------------------------------------------------------------------------------------------

export type Footage = "live" | "archived";
export const FOOTAGE: Footage = "live";

/** Copy that changes with the footage switch. */
export type Copy = string | { readonly live: string; readonly archived: string };
export const copy = (c: Copy, footage: Footage = FOOTAGE): string =>
  typeof c === "string" ? c : c[footage];

// ---------------------------------------------------------------------------------------------
// Approved facts (brief §3): the ONLY numbers and claims allowed. Each carries its evidence.
// On-screen text and counters below are built from these values, never retyped.
// ---------------------------------------------------------------------------------------------

export const FACTS = {
  calibrationGate1: {
    matched: 24,
    total: 24,
    claim: "Gate 1 (contract v5): 24 of 24 cases matched expected verdicts, zero replays.",
    sources: ["runs/gate1-v5/REPORT.md"],
  },
  calibrationGate2: {
    matched: 4,
    total: 4,
    claim: "Gate 2: 4 of 4 (no negative control yet).",
    sources: ["runs/gate2-v5/REPORT.md"],
  },
  greenOnBroken: {
    caught: 11,
    archivedRuns: 97,
    claim:
      "In 97 archived runs, Kane completed every step, green, 11 times on a broken build; Optimus caught each one. Not a Kane error rate.",
    sources: ["runs/kane-vs-optimus/REPORT.md"],
  },
  buildU: {
    baseline: { L1: "PASS", L3: "PASS", L4: "FAIL" },
    claim:
      "Build U: blind build, one planted bug, description sealed until grading. In both archived runs of L4, Kane reported passed and Optimus judged FAIL (\"No books yet.\" after reload).",
    sources: [
      "runs/repair-u/REPORT.md",
      "runs/repair-u/DEFECT-unsealed.txt",
      ".optimus/runs/pack-library/c61591-run-0-UK7fOa/scenario-L4/attempt-1/stdout.ndjson#L141",
      "tests/fixtures/report-bundle/evidence/repair-20261123014521-c61591-run-0/L4-reload.jpg",
    ],
  },
  liveRepairs: {
    count: 3,
    builds: ["C", "D", "U"],
    claim: "3 live repairs, each verified by a fresh Kane run against the unchanged contract.",
    sources: ["runs/repair-c", "runs/repair-d", "runs/repair-u"],
  },
  kaneIssues: {
    numbers: [252, 253],
    claim:
      "Two Kane CLI issues reported: #252 (a reload that never reloads, yet passes), #253 (values recorded from the wrong site).",
    sources: [
      "https://github.com/LambdaTest/kane-cli/issues/252",
      "https://github.com/LambdaTest/kane-cli/issues/253",
    ],
  },
  repairCaps: {
    attempts: 3,
    credits: 1500,
    minutes: 20,
    claim:
      "Caps: 3 attempts, 1,500 credits, 20 minutes. Throwaway copy; contract and grader hashes checked before every re-run.",
    sources: ["AGENTS.md", "src/loop/integrity.ts"],
  },
  tests: {
    passed: 191,
    claim: "191 automated tests passed (npm test; R8 recorded 25 Nov shows 191 passed, 10 files).",
    sources: ["R8"],
  },
  /**
   * The live R1 run (brief §3: "use the new run's own numbers as they appear on screen").
   * Never mix these with the archived session's figures.
   */
  liveRun: {
    session: "repair-20261125041104-7efe46",
    baseline: { minutes: 10.1, credits: 165.18, verdicts: { L1: "PASS", L3: "PASS", L4: "FAIL" } },
    agent: { minutes: 0.6, changedFiles: ["app.js"], insertions: 1, change: "saveBooks();" },
    verification: { minutes: 9.0, credits: 148.1, verdicts: { L1: "PASS", L3: "PASS", L4: "PASS" } },
    creditsUsed: 313.28,
    attemptsUsed: 1,
    /** Kane's own test_md_summary for L4 in the broken baseline run-0 (Optimus judged FAIL). */
    kaneOwnStatus: { run: "run-0", scenario: "L4", overall_status: "passed" },
    claim:
      "Live run: baseline L4 FAIL (expected \"GP Keep 7efe46-run-0\", observed none); Claude Code added one line (saveBooks();) to app.js; integrity ok; fresh Kane run L1/L3/L4 PASS. 313.28 credits, 1 attempt.",
    sources: [
      "r1-terminal.log",
      ".optimus/repair/repair-20261125041104-7efe46/repair-history.json",
      ".optimus/repair/repair-20261125041104-7efe46/attempt-1/brief.md",
      ".optimus/repair/repair-20261125041104-7efe46/attempt-1/change.diff",
      ".optimus/runs/pack-library/7efe46-run-0-L0n6YR/scenario-L4/attempt-1/stdout.ndjson (test_md_summary)",
      "R1",
    ],
  },
} as const;

const F = FACTS;

// ---------------------------------------------------------------------------------------------
// Voiceover script, plain text (fitted to the scenes 25 Nov; the tagged ElevenLabs version is
// docs/video/VO_SCRIPT_ELEVENLABS.md). Recorded as its own stem; SCENES are re-timed to the real
// read. `{live | archived}` variants follow the footage switch.
// ---------------------------------------------------------------------------------------------

export const VO = {
  "VO-1":
    "Kane carried out every step. Green. But the app was broken… and the proof was in what Kane recorded.",
  "VO-2":
    "An instructor has dozens of builds of one assignment, each built differently. Reading every codebase doesn't scale. You need one test… and a verdict you can trust.",
  "VO-3":
    "Optimus starts with one contract: what to do, and what to record. Kane CLI does it in a real browser and records what it sees, never told the expected answer. Optimus judges that evidence with deterministic checks. No AI decides. If the evidence can't prove the action happened, the answer is inconclusive… never a guess.",
  "VO-4a": {
    live: "Here's build U again, in a live run. One bug, sealed until grading.",
    archived: "Here's build U again, in a recorded run. One bug, sealed until grading.",
  },
  "VO-4b":
    "Kane adds a book, reloads, and records what it sees. Optimus reads it: after the reload, the book is gone. A verified fail… though Kane's own status says passed.",
  "VO-4c":
    "Only now does the repair start. Claude Code gets a short brief: the requirement, expected versus observed, and Kane's screenshot. Never the contract. Never the grader.",
  "VO-4d":
    "It works in a throwaway copy of the app… and adds one line: save the list whenever a book is added.",
  "VO-4e":
    "Before anything re-runs, Optimus checks that the contract and the grader are untouched, and that the agent stayed in its throwaway copy.",
  "VO-4f":
    "Then Kane runs every scenario again, from scratch. After the reload, the book is still there. Optimus judges the new recordings… Pass. Kane recorded the failure, Optimus judged it, Claude Code fixed it, and a fresh Kane run proved the fix.",
  "VO-5":
    "Before judging anyone, the contract was calibrated: twenty-four of twenty-four cases matched. In ninety-seven archived runs, Kane completed every step eleven times on a build that was broken… and Optimus caught each one. Along the way, we found two Kane bugs, like a reload that never happened, and reported both.",
  "VO-6":
    "One contract. Many independent builds. Verified failures, controlled repairs, and evidence you can inspect. Run the offline tests, open the report… and see the proof.",
} as const satisfies Record<string, Copy>;

export type VoId = keyof typeof VO;

// ---------------------------------------------------------------------------------------------
// Recordings the owner captures (brief §5). Drop files into public/recordings/ with these names.
// `npm run assets` reports which are present. Captured without audio, 16:9.
// ---------------------------------------------------------------------------------------------

// Recorded 24–25 Nov. All 60 fps H.264; widths 1900–1920 (fitted proportionally, never stretched);
// their audio tracks are silent and are always muted.
export const RECORDINGS = {
  R1: { file: "recordings/R1.mp4", what: "Live repair of build U, session 7efe46 (23:13, time-lapsed)", usedIn: ["4a", "4b", "4e", "4f"] },
  R2: { file: "recordings/R2.mp4", what: "The brief the agent received (live session)", usedIn: ["4c"], archivedFallback: "runs/repair-u/attempt-1-brief.md" },
  R3: { file: "recordings/R3.mp4", what: "The agent's code change: + saveBooks(); (live session)", usedIn: ["4d"], archivedFallback: "runs/repair-u/attempt-1-change.diff" },
  R4: { file: "recordings/R4-contract.mp4", what: "pack.yaml L4, then a neutral _test.md", usedIn: ["3"] },
  /** The deployed report predates the live run: it shows the ARCHIVED sessions, so it is used only in scene 5, labelled. */
  R5: { file: "recordings/R5.mp4", what: "The report (archived sessions): U baseline FAIL → verified PASS", usedIn: ["5"] },
  R6: { file: "recordings/R6-hero.mp4", what: "Website hero and agents", usedIn: ["1", "6"] },
  /** Contains a zoom baked in by OpenScreen: no extra punch-in over that part. */
  R7: { file: "recordings/R7-issues.mp4", what: "Kane issues #252 and #253 (guest window)", usedIn: ["5"] },
  R8: { file: "recordings/R8.mp4", what: "npm test → \"Tests 191 passed (191)\"", usedIn: ["6"] },
  R9: { file: "recordings/R9-green-passed.mp4", what: "Archived green \"overall_status\":\"passed\" (ndjson line 141), 3.8 s", usedIn: ["1"] },
  R10: { file: "recordings/R10.mp4", what: "gate1-v5 result line; kane-vs-optimus table", usedIn: ["5"] },
} as const;

export type RecordingId = keyof typeof RECORDINGS;

/** Stills copied into public/ by `npm run assets` (scripts/sync-assets.mjs). */
export const STILLS = {
  /** Hook + archived 4b: after the reload, "No books yet." (archived session c61591, baseline run-0). */
  uBrokenReload: "evidence/u-archived-run-0-L4-reload.jpg",
  /** Archived 4f: after the fix, the book survives the reload (session c61591, run-2). */
  uFixedReload: "evidence/u-archived-run-2-L4-reload.jpg",
  /** Live 4b: Kane's end-of-step screenshot after the reload, baseline run-0 ("No books yet."). */
  liveBrokenReload: "evidence/u-live-run-0-L4-reload.jpg",
  /** Live 4f: after the fix, run-1 — "GP Keep 7efe46-run-1" survives the reload. */
  liveFixedReload: "evidence/u-live-run-1-L4-reload.jpg",
} as const;

// ---------------------------------------------------------------------------------------------
// Storyboard (brief §7): scenes in order. Durations in frames; start frames are derived, so
// scenes can never gap or overlap. Each on-screen line appears `at` frames into its scene and
// must stay readable ≥ MOTION.readHold before the next line or the scene end (checked).
// ---------------------------------------------------------------------------------------------

export type Line = { readonly id: string; readonly text: Copy; readonly at: number };

export type Scene = {
  readonly id: string;
  readonly name: string;
  readonly storyFunction: string;
  readonly frames: number;
  readonly picture: string;
  readonly recordings: readonly RecordingId[];
  readonly lines: readonly Line[];
  readonly vo: VoId;
  readonly reviewCriterion: string;
  /** Needs the owner's creative approval before the full render (brief §7). */
  readonly needsApproval?: boolean;
};

export const SCENES: readonly Scene[] = [
  {
    id: "1",
    name: "Hook",
    storyFunction: "The contradiction",
    frames: s(10),
    picture:
      "R9 green `passed`, highlighted → cut to the \"No books yet.\" still (same run) → Optimus FAIL badge; pixel sky behind",
    recordings: ["R9"],
    lines: [
      { id: "kane-passed", text: "Kane: every step passed", at: s(0.5) },
      { id: "app-broken", text: "The app: broken", at: s(4) },
      { id: "archived-label", text: "Archived run, build U", at: s(4) },
    ],
    vo: "VO-1",
    reviewCriterion: "Both lines readable ≥ 1.5 s; the still is labelled \"archived run, build U\"",
    needsApproval: true,
  },
  {
    id: "2",
    name: "Problem",
    storyFunction: "One assignment, many builds",
    frames: s(12),
    picture: "Five build cards (A, B, C, D, U) stagger in over the dusk scene",
    recordings: [],
    lines: [{ id: "many-builds", text: "One assignment. Many builds.", at: s(1) }],
    vo: "VO-2",
    reviewCriterion: "Cards stagger, none overlap text",
  },
  {
    id: "3",
    name: "How it works",
    storyFunction: "Contract → Kane records → Optimus judges → controlled repair",
    frames: s(23),
    picture:
      "R4 contract → `_test.md` with \"no expected values\" callout → four step cards; verdict badges PASS / FAIL / INCONCLUSIVE",
    recordings: ["R4"],
    lines: [
      { id: "kane-acts", text: "Kane acts and records.", at: s(8) },
      { id: "optimus-judges", text: "Optimus judges. No AI decides.", at: s(11.5) },
      { id: "inconclusive", text: "Not enough evidence → INCONCLUSIVE", at: s(17) },
    ],
    vo: "VO-3",
    reviewCriterion: "Each label ≥ 1.5 s; ticks only after cards settle",
  },
  {
    id: "4a",
    name: "Repair: introduce U",
    storyFunction: "Same build as the hook",
    frames: s(6.7),
    picture: "R1 opening lines; small label",
    recordings: ["R1"],
    lines: [
      {
        id: "u-label",
        text: {
          live: "Build U · bug sealed until grading · live run",
          archived: "Build U · bug sealed until grading · archived run",
        },
        at: s(0.5),
      },
    ],
    vo: "VO-4a",
    reviewCriterion: "Clearly the same build as the hook; label matches the footage switch",
  },
  {
    id: "4b",
    name: "Repair: show the bug",
    storyFunction: "Verified FAIL",
    frames: s(13.5),
    picture:
      "R1 time-lapse (timer + credits overlay) → punch-in on L4 FAIL with red glow → \"No books yet.\" still from the same run",
    recordings: ["R1"],
    lines: [
      { id: "verified-fail", text: "Verified FAIL", at: s(7.7) },
      { id: "book-gone", text: "After reload: the book is gone", at: s(9.8) },
      // Approved 25 Nov (FACTS.liveRun.kaneOwnStatus): Kane's own status on the same broken run.
      { id: "kane-own-status", text: "Kane's own status for this run: passed", at: s(9.8) },
    ],
    vo: "VO-4b",
    reviewCriterion: "FAIL line legible when zoomed; time-lapse labelled",
    needsApproval: true,
  },
  {
    id: "4c",
    name: "Repair: the bounded brief",
    storyFunction: "What the agent is given",
    frames: s(12),
    picture: "R2: requirement, expected vs observed, screenshot",
    recordings: ["R2"],
    lines: [{ id: "brief", text: "Brief → Claude Code (no contract, no grader)", at: s(1) }],
    vo: "VO-4c",
    reviewCriterion: "Expected and observed both readable",
  },
  {
    id: "4d",
    name: "Repair: the code change",
    storyFunction: "The real diff",
    frames: s(8),
    picture: "R3 diff, punch-in on the changed lines",
    recordings: ["R3"],
    lines: [
      {
        id: "change",
        // Approved 25 Nov; same diff in the live and archived runs (+ saveBooks(); in app.js).
        text: "One line added: save the list when a book is added",
        at: s(3),
      },
    ],
    vo: "VO-4d",
    reviewCriterion: "The changed lines are legible",
  },
  {
    id: "4e",
    name: "Repair: integrity",
    storyFunction: "Nothing but the app changed",
    frames: s(9.5),
    picture: "R1 lines or the history: contract hash, grader hash, isolated copy, each ticking",
    recordings: ["R1"],
    lines: [
      { id: "contract-ok", text: "Contract unchanged ✓", at: s(2.5) },
      { id: "grader-ok", text: "Grader unchanged ✓", at: s(4.5) },
      { id: "copy-ok", text: "Throwaway copy ✓", at: s(6.5) },
    ],
    vo: "VO-4e",
    reviewCriterion: "Ticks only after each line settles",
  },
  {
    id: "4f",
    name: "Repair: fresh verification",
    storyFunction: "Optimus's PASS on a fresh Kane run",
    frames: s(17.5),
    picture:
      "Re-run time-lapse → after-fix screenshot (book still there after reload) → Optimus verdicts L1 PASS · L3 PASS · L4 PASS, lime glow",
    recordings: ["R1"],
    lines: [
      { id: "fresh-run", text: "Fresh Kane run, same contract", at: s(1) },
      { id: "verdict-pass", text: "Optimus verdict: PASS", at: s(9.2) },
    ],
    vo: "VO-4f",
    reviewCriterion:
      "Both shown: the new Kane execution and Optimus's verdict on its evidence; the PASS is never Kane's own status",
    needsApproval: true,
  },
  {
    id: "5",
    name: "Proof, with sources",
    storyFunction: "Every number beside its source",
    frames: s(20.6),
    picture:
      "Three pages, one VO part each: 24/24 (R10), 11 of 97 (R10), issues #252/#253 (R7); each counter beside its source",
    recordings: ["R10", "R7"],
    lines: [
      {
        id: "calibrated",
        text: `${F.calibrationGate1.matched}/${F.calibrationGate1.total} calibrated`,
        at: s(3.5),
      },
      {
        id: "green-broken",
        text: `${F.greenOnBroken.caught} green runs on broken builds — caught`,
        at: s(9.7),
      },
      { id: "kane-bugs", text: `${F.kaneIssues.numbers.length} Kane bugs reported`, at: s(16) },
    ],
    vo: "VO-5",
    reviewCriterion: "Numbers match FACTS; each source visible while its number is on screen",
  },
  {
    id: "6",
    name: "Close",
    storyFunction: "Call to action",
    frames: s(19.93),
    picture:
      "R8 \"191 passed\" (\"Run the offline tests\") → R5 report (\"open the report…\") → motion-design logo ending over the hero plate, tagline spoken line by line; URLs",
    recordings: ["R8", "R5"],
    lines: [
      { id: "tests", text: `${F.tests.passed} passed`, at: s(0.8) },
      {
        id: "tagline",
        text: "One contract. Many independent builds. Evidence you can inspect.",
        at: s(9.6),
      },
      { id: "urls", text: "optimus-one-mu.vercel.app · github.com/ChukwuebukaHenrey/Optimus", at: s(12.5) },
    ],
    vo: "VO-6",
    reviewCriterion: "End card held ≥ 4 s, no fast exit; URLs readable",
    needsApproval: true,
  },
];

/** Scenes with their derived start frame. */
export const TIMELINE = SCENES.reduce<Array<Scene & { from: number }>>((acc, scene) => {
  const prev = acc[acc.length - 1];
  acc.push({ ...scene, from: prev ? prev.from + prev.frames : 0 });
  return acc;
}, []);

export const DURATION_IN_FRAMES = SCENES.reduce((sum, sc) => sum + sc.frames, 0);

// ---------------------------------------------------------------------------------------------
// Counters (brief §4): count up over ~1 s, each beside its source.
// ---------------------------------------------------------------------------------------------

export const COUNTERS = [
  { id: "calibration", scene: "5", to: F.calibrationGate1.matched, of: F.calibrationGate1.total, source: "R10" },
  { id: "green-on-broken", scene: "5", to: F.greenOnBroken.caught, of: F.greenOnBroken.archivedRuns, source: "R10" },
  { id: "kane-issues", scene: "5", to: F.kaneIssues.numbers.length, source: "R7" },
] as const;

// ---------------------------------------------------------------------------------------------
// Motion tokens (brief §4; master prompt Phase 4). Frames at 60 fps.
// Easing values are engineering choices (assumption), tuned in the taste pass.
// ---------------------------------------------------------------------------------------------

export const MOTION = {
  /** ~0.5 s eased entrance, slight overshoot. */
  entrance: s(0.5),
  /** Exits faster than entrances. */
  exit: s(0.3),
  /** Key text readable and still for at least 1.5 s. */
  readHold: s(1.5),
  /** Counters climb over ~1 s, never jump. */
  countUp: s(1),
  /** Related items stagger by a few frames. */
  stagger: 5,
  /** Check marks appear only after their card settles. */
  tickAfterSettle: 6,
  /** Slow eased punch-ins on recordings. */
  punchIn: s(1.4),
  punchInScale: 1.6,
  /** End card hold (brief §7 scene 6). */
  endCardHold: s(4),
  easing: {
    /** cubic-bezier: entrance with a restrained overshoot. */
    entrance: [0.22, 1.18, 0.36, 1],
    exit: [0.55, 0, 1, 0.45],
    camera: [0.65, 0, 0.35, 1],
  },
} as const;

// ---------------------------------------------------------------------------------------------
// Layout (brief §4): centre origin, safe areas, recording frame, integer pixel-art scaling.
// ---------------------------------------------------------------------------------------------

export const LAYOUT = {
  /** Title-safe area (90%): nothing critical outside it. */
  titleSafe: { width: 1728, height: 972 },
  /** Screen recordings sit centred in this frame, scaled proportionally, soft shadow. */
  recordingFrame: { width: 1600, height: 900, radius: 12, shadow: "0 24px 64px rgb(6 33 61 / 0.45)" },
  /** Caption/scrim text: white on a dark scrim (≥ 4.5:1). */
  scrim: "rgb(6 33 61 / 0.72)",
} as const;

/**
 * Pixel art (website/public/art): nearest-neighbour, whole-number scales only.
 * `scale` is the whole-number factor used on the 1920×1080 canvas.
 */
export const PIXEL_ART = {
  heroPlate: { file: "art/scene/H-01-plate.png", width: 640, height: 360, scale: 3 }, // = 1920×1080 exactly
  duskPlate: { file: "art/scene/F-01-dusk.png", width: 480, height: 190, scale: 4 }, // 1920×760: needs a sky fill above
  editorialContract: { file: "art/editorial/E-01-contract.png", width: 320, height: 181, scale: 3 },
  editorialEvidence: { file: "art/editorial/E-02-evidence.png", width: 320, height: 185, scale: 3 },
  editorialVerdicts: { file: "art/editorial/E-03-verdicts.png", width: 320, height: 185, scale: 3 },
  editorialRepair: { file: "art/editorial/E-04-repair.png", width: 320, height: 185, scale: 3 },
} as const;

// ---------------------------------------------------------------------------------------------
// Brand (brief §1 [COLORS], [FONTS], [LOGO]); values from website/src/app/globals.css.
// ---------------------------------------------------------------------------------------------

export const COLORS = {
  sky: "#128AEF", // the hero plate's own sky colour
  azure: "#198DE5",
  deep: "#0B5FA8",
  ink: "#06213D",
  paper: "#F5F5F2",
  charcoal: "#3B3B3B",
  lime: "#D9F53B",
  white: "#FFFFFF",
  verdict: {
    PASS: { fg: "#0F5132", bg: "#DDF1E4", glow: "#D9F53B" },
    FAIL: { fg: "#8E1C1C", bg: "#FBE3E0", glow: "#E5484D" }, // glow red: assumption (no site token)
    INCONCLUSIVE: { fg: "#7A4A00", bg: "#FCEBC7", glow: "#F2B33D" }, // glow amber: assumption
  },
} as const;

export const FONTS = {
  display: { family: "Bricolage Grotesque", file: "fonts/bricolage-grotesque.woff2" },
  body: { family: "Atkinson Hyperlegible Next", file: "fonts/atkinson-hyperlegible-next.woff2" },
  mono: { family: "Atkinson Hyperlegible Mono", file: "fonts/atkinson-hyperlegible-mono.woff2" },
  /** The woff2 files are variable fonts (as declared in src/report/styles.ts). */
  weightRange: "200 800",
} as const;

export const LOGO = {
  /** "Optimus" is set in the display font next to the icon, as on the site (not the wordmark SVG). */
  word: "Optimus",
  /**
   * The icon is drawn from the shared path in src/report/mark.ts (same mark as
   * docs/Optimus_CoreOS_Components.zip optimus-icon-*.svg, whose files carry an opaque
   * background square). Drawn with `currentColor`, so it works on sky and dusk.
   */
  iconSource: "src/report/mark.ts",
} as const;

export const CTA = {
  line: "Run the offline tests, open the report, and see the proof.",
  website: "optimus-one-mu.vercel.app",
  repo: "github.com/ChukwuebukaHenrey/Optimus",
} as const;

// ---------------------------------------------------------------------------------------------
// Audio (brief §2, §11): three stems, always separate, aligned to frame 0.
// ---------------------------------------------------------------------------------------------

export const AUDIO = {
  stems: {
    vo: "audio/vo.wav",
    music: "audio/music.wav",
    sfx: "audio/sfx.wav",
  },
  /** Music: the owner's reference track, edited to the picture (MUSIC_EDIT). */
  music: {
    source: "licensed" as "generated" | "licensed",
    file: "docs/video/lnplusmusic-product-product-launch-611921.mp3",
    licence: "Creative Commons / free licence from the creator, as stated by the owner on 25 Nov 2026",
    bpm: 100,
    approved: true,
    /** Integrated loudness of the music stem on its own (ducked under the voice in the mix). */
    stemLufs: -16,
  },
  /**
   * Three SFX cues only (brief §2), timed in scripts/make-audio.ts from SHOTS + MOTION so they land
   * on the frame the picture changes: the hook's cut to the broken app, the FAIL glow, the PASS glow.
   */
  sfxCues: [
    { id: "contradiction-impact", scene: "1", note: "one impact on the opening contradiction" },
    { id: "fail-confirmed", scene: "4b", note: "subtle cue on the confirmed FAIL" },
    { id: "pass-verified", scene: "4f", note: "restrained positive cue on the verified PASS" },
  ],
  /** Playback gains in the composition. `voReady` switches the music to its ducked level. */
  /** Playback gains. The music rises between voice blocks and ducks about 11 dB under the voice. */
  mix: { voReady: true, voice: 1, music: 0.6, musicUnderVo: 0.28, duckRamp: 0.35, sfx: 0.8 },
  levels: { dialogueLufs: -16, musicDuckDb: -11, mixLufs: -14, truePeakDbtp: -1 },
} as const;

// ---------------------------------------------------------------------------------------------
// Tooling (brief §1 [TOOLING]). Remotion renders with its own bundled FFmpeg; the system FFmpeg
// below is for ffprobe verification and pre-processing (e.g. time-lapsing the 30–45 min R1).
// Override with the OPTIMUS_FFMPEG_DIR environment variable.
// ---------------------------------------------------------------------------------------------

export const TOOLING = {
  ffmpegDir: "C:\\Users\\ADMIN\\tools\\ffmpeg\\ffmpeg-9.1-essentials_build\\bin",
  output: "out/optimus-demo.mp4",
} as const;

// ---------------------------------------------------------------------------------------------
// Shots: how each scene uses the real footage. Times are seconds into the SOURCE file unless
// named `at`/`from`/`to` within a scene (seconds into the scene). Rects are SOURCE pixels.
// Mapped 25 Nov from the files themselves (R1 timeline: recording time = log time − 05:10:52.5).
// ---------------------------------------------------------------------------------------------

export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/** Native size of each recording (OpenScreen exports vary slightly; never stretched). */
export const SOURCE_SIZE: Record<RecordingId, { readonly w: number; readonly h: number }> = {
  R1: { w: 1920, h: 1080 },
  R2: { w: 1900, h: 1080 },
  R3: { w: 1900, h: 1080 },
  R4: { w: 1900, h: 1080 },
  R5: { w: 1918, h: 1080 },
  R6: { w: 1918, h: 1080 },
  R7: { w: 1900, h: 1080 },
  R8: { w: 1920, h: 1080 },
  R9: { w: 1920, h: 1080 },
  R10: { w: 1900, h: 1080 },
};

/**
 * Speed-ups pre-rendered from the real recordings by `npm run derive` (system FFmpeg), so a
 * 10-minute Kane run plays smoothly in a few seconds. Always labelled on screen.
 */
export const DERIVED = {
  r1Intro: { from: "R1", start: 6, end: 22, seconds: 8, file: "derived/r1-intro-2x.mp4" },
  r1Baseline: { from: "R1", start: 22, end: 630.5, seconds: 5, file: "derived/r1-baseline-timelapse.mp4" },
  r1Verify: { from: "R1", start: 673.5, end: 1213, seconds: 3.8, file: "derived/r1-verify-timelapse.mp4" },
} as const satisfies Record<string, { from: RecordingId; start: number; end: number; seconds: number; file: string }>;

/** Freeze frames from the real recordings (for slow punch-ins on one line). */
export const FREEZES = {
  r9Passed: { from: "R9", at: 3.6, file: "derived/r9-passed.png" },
  r1Fail: { from: "R1", at: 632, file: "derived/r1-fail.png" },
  r1Integrity: { from: "R1", at: 672, file: "derived/r1-integrity.png" },
  r1Pass: { from: "R1", at: 1213.5, file: "derived/r1-pass.png" },
  r2Brief: { from: "R2", at: 12, file: "derived/r2-brief.png" },
  r3Diff: { from: "R3", at: 5, file: "derived/r3-diff.png" },
  r8Tests: { from: "R8", at: 34.2, file: "derived/r8-tests.png" },
  r10Calibration: { from: "R10", at: 5, file: "derived/r10-calibration.png" },
  r10GreenBroken: { from: "R10", at: 39, file: "derived/r10-green-broken.png" },
} as const satisfies Record<string, { from: RecordingId; at: number; file: string }>;

/** R1's terminal text sits top-left; every R1 shot starts from this 16:9 framing. */
const R1_FRAME: Rect = { x: 0, y: 0, w: 1200, h: 675 };
/** R4: the editor only. The terminal panel below y≈690 shows the computer name and is never in frame. */
const R4_EDITOR: Rect = { x: 60, y: 40, w: 1400, h: 650 };
/** R1 while only the first lines exist (intro, baseline time-lapse): a wide strip, so the text stays large. */
const R1_TOP: Rect = { x: 0, y: 0, w: 1100, h: 400 };
/** Kane's end-of-step screenshots: zoom to the Library heading, the form and the Books list. */
const KANE_BOOKS: Rect = { x: 500, y: 20, w: 920, h: 600 };

export const SHOTS = {
  "1": {
    passed: { freeze: "r9Passed", frame: { x: 0, y: 0, w: 1920, h: 1080 }, focus: { x: 110, y: 760, w: 1100, h: 320 }, glow: { x: 385, y: 924, w: 240, h: 24 }, to: 4 },
    broken: { still: "uBrokenReload", from: 4, focus: KANE_BOOKS, label: "Archived run · build U · Kane's screenshot after the reload" },
    /** Introduces the book test on screen from the first seconds (no voiceover change). */
    testLabel: "The test · Library app: add a book, reload the page, is it still there?",
    failBadgeAt: 6.5,
  },
  "2": {
    /** Introduces the Library assignment (the book test) without new voiceover. */
    assignment: "The assignment · a Library app: add books, remove them, keep them after a reload",
    appTitle: "Library",
  },
  "3": {
    contract: { rec: "R4", trim: 1, from: 0, to: 8, frame: R4_EDITOR, label: "The contract · packs/library/pack.yaml · L4: add a book, reload, record the list" },
    testMd: { rec: "R4", trim: 26.3, from: 8, to: 11, frame: R4_EDITOR, label: "What Kane is told · L4_test.md", callout: "No expected values" },
    cardsFrom: 11,
    verdictsAt: 17,
  },
  "4a": { intro: { derived: "r1Intro", frame: R1_TOP, label: "Live run · 2× speed · L1 add · L3 remove · L4 add a book, then reload" } },
  "4b": {
    timelapse: { derived: "r1Baseline", frame: R1_TOP, to: 5 },
    fail: { freeze: "r1Fail", from: 5.5, to: 9.6, focusAt: 1.1, frame: R1_FRAME, focus: { x: 0, y: 250, w: 760, h: 170 }, glow: { x: 0, y: 324, w: 720, h: 21 } },
    kaneShot: { still: "liveBrokenReload", from: 9.6, focus: KANE_BOOKS, label: "Kane's screenshot after the reload · live baseline run" },
  },
  "4c": { brief: { rec: "R2", trim: 0.5, frame: { x: 0, y: 30, w: 1900, h: 1050 }, focus: { x: 100, y: 410, w: 1000, h: 240 }, focusAt: 4.3, glow: { x: 160, y: 553, w: 260, h: 54 }, label: "The brief Claude Code received · live run" } },
  "4d": { diff: { freeze: "r3Diff", frame: { x: 0, y: 0, w: 1900, h: 1080 }, focus: { x: 40, y: 90, w: 700, h: 260 }, focusAt: 1, glow: { x: 135, y: 288, w: 170, h: 25 }, label: "The change · app.js · live run" } },
  "4e": { integrity: { freeze: "r1Integrity", frame: R1_FRAME, focus: { x: 0, y: 330, w: 1060, h: 170 }, focusAt: 0.5, glow: { x: 0, y: 408, w: 1035, h: 20 }, label: "Integrity checks before the re-run · live run" } },
  "4f": {
    timelapse: { derived: "r1Verify", frame: R1_FRAME, to: 3.8 },
    kaneShot: { still: "liveFixedReload", from: 3.8, to: 6.6, focus: KANE_BOOKS, label: "Kane's screenshot after the reload · fresh run" },
    pass: { freeze: "r1Pass", from: 6.6, focusAt: 1.13, frame: R1_FRAME, focus: { x: 0, y: 520, w: 760, h: 170 }, glow: { x: 0, y: 591, w: 560, h: 20 } },
  },
  "5": {
    calibration: { freeze: "r10Calibration", from: 0, to: 6, statAt: 3, frame: { x: 0, y: 30, w: 1900, h: 1050 }, focus: { x: 60, y: 200, w: 1100, h: 200 }, focusAt: 0.6, glow: { x: 120, y: 266, w: 880, h: 24 }, source: "runs/gate1-v5/REPORT.md" },
    greenBroken: { freeze: "r10GreenBroken", from: 6, to: 14.6, statAt: 3, frame: { x: 0, y: 30, w: 1900, h: 1050 }, focus: { x: 60, y: 600, w: 1300, h: 300 }, focusAt: 0.6, glow: { x: 120, y: 698, w: 540, h: 30 }, source: "runs/kane-vs-optimus/REPORT.md" },
    issues252: { rec: "R7", trim: 0.5, from: 14.6, to: 17.6, statAt: 1, frame: { x: 0, y: 60, w: 1900, h: 1020 }, source: "github.com/LambdaTest/kane-cli/issues/252" },
    issues253: { rec: "R7", trim: 12.5, from: 17.6, to: 20.6, frame: { x: 0, y: 60, w: 1900, h: 1020 }, source: "github.com/LambdaTest/kane-cli/issues/253" },
  },
  "6": {
    tests: { freeze: "r8Tests", from: 0, to: 3.6, frame: { x: 0, y: 0, w: 1920, h: 1080 }, focus: { x: 0, y: 560, w: 900, h: 300 }, focusAt: 0.2, glow: { x: 0, y: 704, w: 250, h: 36 } },
    report: { rec: "R5", trim: 10.5, from: 3.6, to: 7.6, frame: { x: 300, y: 120, w: 1360, h: 830 }, label: "The report · archived sessions · U: baseline FAIL → verified PASS" },
    /** The logo ending: the mark lands on the music's final section (film 2:21.0 = 8.2 s into this scene). */
    endCard: { from: 7.6, markHit: 8.2, tagParts: [9.6, 10.85, 15.4] },
  },
} as const;

// ---------------------------------------------------------------------------------------------
// Voiceover (owner's ElevenLabs take, 25 Nov: Eleven v4, one take of all blocks). Each block is cut
// from the take (times found by aligning the script's phrases to the take's pauses) and placed
// `at` seconds into its scene so its key words land on the picture. `npm run audio` assembles
// public/audio/vo.wav from this table.
// ---------------------------------------------------------------------------------------------

export const VO_TAKE = {
  file: "audio/vo/vo-take.mp3",
  source: "out/ElevenLabs_2026-11-25T12_36_28_Max - Elearning and Documentary_pvc_s50_sim75_v4.mp3",
  /** Voice stem loudness: set so the final mix lands at the brief's -14 LUFS (measured on the mix). */
  stemLufs: -14.5,
  /** Each block is one or more clips of the take, `at` seconds into the block's scene. */
  blocks: {
    "VO-1": [{ take: [0.0, 7.34], at: 0.3 }], //    "BROKEN" (+3.87) lands on the cut to the broken app (4.0)
    "VO-2": [{ take: [7.85, 17.68], at: 0.5 }],
    "VO-3": [{ take: [18.19, 39.16], at: 0.4 }], // "never told" on _test.md (8-11); "judges" on the cards (11); "inconclusive" on the badges (17)
    "VO-4a": [{ take: [39.6, 44.3], at: 0.6 }],
    "VO-4b": [{ take: [44.77, 56.18], at: 0.3 }], // "A verified fail" (+7.82) on the red highlight (8.07); "passed" on Kane's screenshot (9.6)
    "VO-4c": [{ take: [56.6, 67.27], at: 0.4 }], // "expected versus observed" (+5.11) as the highlight lands (5.77)
    "VO-4d": [{ take: [67.69, 73.48], at: 0.5 }], // "adds one line" (+2.32) after the highlight on + saveBooks(); (2.47)
    "VO-4e": [{ take: [73.87, 81.2], at: 0.4 }],
    "VO-4f": [{ take: [81.64, 97.96], at: 0.3 }], // "the book is still there" on the screenshot (3.8); "Pass" (+8.94) on the lime highlight (9.2)
    // One part per page: calibration (0-6), eleven caught (6-14.6), two Kane bugs (14.6-20.6).
    "VO-5": [
      { take: [98.35, 103.78], at: 0.4 }, // "Before judging anyone, … twenty-four of twenty-four cases matched."
      { take: [104.16, 111.8], at: 6.3 }, // "In ninety-seven archived runs, … and Optimus caught each one."
      { take: [112.18, 117.3], at: 14.9 }, // "Along the way, we found two Kane bugs, … and reported both."
    ],
    // Tests page (0-3.6), report page (3.6-7.6), then the closing paragraph over the logo ending.
    "VO-6": [
      { take: [125.48, 126.87], at: 0.5 }, // "Run the offline tests,"
      { take: [127.17, 129.57], at: 3.9 }, // "open the report… and see the proof."
      { take: [117.71, 125.1], at: 9.6 }, // "One contract. Many independent builds. Verified failures, controlled repairs, and evidence you can inspect."
    ],
  } satisfies Record<VoId, ReadonlyArray<{ take: readonly [number, number]; at: number }>>,
} as const;

// ---------------------------------------------------------------------------------------------
// Music: the owner's reference track, edited on its own bar grid (100 BPM, downbeats at
// 0.61 + 2.4n s; 4-bar phrases; drops at bars 16 and 28). Pieces play back to back from frame 0;
// every join is a phrase start. Drop 1 (39.01) lands on scene 4a (0:45.0), drop 2 (67.81) on
// scene 5 (1:52.2), and the track's own ending closes the film.
// ---------------------------------------------------------------------------------------------

export const MUSIC_EDIT = {
  file: "audio/music-ref.mp3",
  pieces: [
    [3.61, 19.81], // intro + A (faded in)
    [10.21, 58.21], // A again, breakdown, drop 1 at 39.01, B
    [39.01, 58.21], // B again (under the repair)
    [39.01, 67.81], // B, then breakdown 2 under "Pass"
    [67.81, 96.61], // drop 2, final section (the proof)
    [106.21, 117.94], // the track's ending
  ] as ReadonlyArray<readonly [number, number]>,
  fadeIn: 1.0,
  crossfade: 0.04,
} as const;
