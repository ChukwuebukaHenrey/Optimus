import { actionForStep, type Scenario } from '../core/pack.js';
import type { ActionKind, Observation, RunRecord, ScenarioTrace } from '../core/types.js';

type Event = Record<string, unknown>;
type Runtime = Pick<RunRecord, 'kaneExitCode' | 'evidencePackPath' | 'packHash' | 'nonce' | 'appUrl'>;

const interactions = new Set(['click', 'double_click', 'fill', 'type', 'press', 'select', 'check', 'uncheck', 'tap', 'drag']);
const navigations = new Set(['navigate', 'reload']);

function object(value: unknown): Event | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Event : undefined;
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function matchesAction(kind: ActionKind, action: unknown) {
  if (typeof action !== 'string' || kind === 'none') return false;
  return kind === 'interact' ? interactions.has(action) : navigations.has(action);
}

interface ActiveStep {
  index: number;
  actionRecorded: boolean | null;
  finalState?: Event;
  actionIndex?: number;
  screenshotRef: string | null;
  evidenceRef: string | null;
}

// Provisional adapter. A live author run must confirm the action and artifact shapes.
export function parseKaneNdjson(ndjson: string, scenario: Scenario, runtime: Runtime): ScenarioTrace {
  const observations: Observation[] = [];
  const stepsSkipped: number[] = [];
  const seenSteps = new Set<number>();
  let active: ActiveStep | undefined;
  let summary: Event | undefined;
  let done: Event | undefined;
  let kaneVersion: string | null = null;

  for (const [lineIndex, line] of ndjson.split(/\r?\n/u).entries()) {
    if (!line.trim()) continue;
    let event: Event | undefined;
    try {
      event = object(JSON.parse(line));
    } catch {
      throw new Error(`Invalid Kane NDJSON at line ${lineIndex + 1}.`);
    }
    if (typeof event?.type !== 'string') throw new Error(`Invalid Kane event at line ${lineIndex + 1}.`);

    switch (event.type) {
      case 'stream_start':
        kaneVersion = text(event.cli_version);
        break;
      case 'test_md_step_start': {
        const index = (count(event.step_index) ?? 0) - 1;
        if (active || seenSteps.has(index) || !scenario.steps[index] || summary || done) {
          throw new Error(`Invalid Kane step start at line ${lineIndex + 1}.`);
        }
        seenSteps.add(index);
        active = { index, actionRecorded: null, screenshotRef: null, evidenceRef: null };
        break;
      }
      case 'step_event': {
        if (!active || event.event !== 'action' || typeof event.success !== 'boolean') break;
        const kind = actionForStep(scenario.steps[active.index], active.index);
        if (!matchesAction(kind, event.action_type)) break;
        if (event.success) {
          active.actionRecorded = true;
          active.actionIndex = count(event.index) ?? undefined;
          active.screenshotRef = null;
          active.evidenceRef = null;
        } else if (active.actionRecorded === null) {
          active.actionRecorded = false;
        }
        break;
      }
      case 'step_end':
        if (active?.actionIndex !== undefined && active.actionIndex === count(event.index)) {
          active.screenshotRef = text(event.screenshot);
          active.evidenceRef = text(event.action_id);
        }
        break;
      case 'run_end':
        if (active) active.finalState = object(event.final_state);
        break;
      case 'test_md_step_end': {
        const index = (count(event.step_index) ?? 0) - 1;
        const step = scenario.steps[index];
        if (event.status === 'skipped' && step && !summary && !done &&
          (active?.index === index || (!active && !seenSteps.has(index)))) {
          seenSteps.add(index);
          stepsSkipped.push(index);
          active = undefined;
          break;
        }
        if (!active || active.index !== index || !step) throw new Error(`Invalid Kane step end at line ${lineIndex + 1}.`);
        const state = active.finalState;
        const values = Object.fromEntries(Object.keys(step.record).map((key) => {
          const value = state && Object.hasOwn(state, key) ? state[key] : null;
          return [key, typeof value === 'number' && Number.isFinite(value) ? String(value) : text(value)];
        }));
        observations.push({
          stepIndex: index, stepId: step.id, actionKind: actionForStep(step, index),
          actionRecorded: active.actionRecorded, targetAgreement: 'unknown', values,
          screenshotRef: active.screenshotRef, evidenceRef: active.evidenceRef,
        });
        active = undefined;
        break;
      }
      case 'test_md_summary':
        if (active || summary || done) throw new Error(`Unexpected Kane summary at line ${lineIndex + 1}.`);
        summary = event;
        break;
      case 'test_md_done':
        if (!summary || done) throw new Error(`Unexpected Kane completion at line ${lineIndex + 1}.`);
        done = event;
        break;
    }
  }

  const summarySteps = object(summary?.steps);
  const reportedSkips = count(summarySteps?.skipped);
  const completed = done !== undefined && summary?.cancelled !== true && object(summary?.upload)?.succeeded !== false &&
    (reportedSkips === null || reportedSkips === stepsSkipped.length);
  return {
    scenarioId: scenario.id,
    run: {
      ...runtime, completed, kaneVersion, executionId: text(done?.session_id), stepsSkipped,
      replayDecisions: count(summarySteps?.replay_decisions), authorDecisions: count(summarySteps?.author_decisions),
    },
    observations,
  };
}
