import { actionForStep, type Scenario } from '../core/pack.js';
import type { ActionKind, Observation, RunRecord, ScenarioTrace } from '../core/types.js';
import type { KaneEvidence } from './evidence.js';

type Event = Record<string, unknown>;
type Runtime = Pick<RunRecord, 'kaneExitCode' | 'evidencePackPath' | 'packHash' | 'nonce' | 'appUrl'>;

const interactions = new Set(['click', 'double_click', 'fill', 'type', 'press', 'select', 'check', 'uncheck', 'tap', 'drag']);
const navigations = new Set(['navigate', 'reload', 'refresh']);

function object(value: unknown): Event | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Event : undefined;
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function recordedValue(value: unknown): string | null {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : text(value);
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
  runEnds: number;
  runId?: string;
  innerRunUsable?: boolean;
  actionRecorded: boolean | null;
  finalState?: Event;
  actionIndex?: number;
  screenshotRef: string | null;
  evidenceRef: string | null;
}

export function parseKaneNdjson(ndjson: string, scenario: Scenario, runtime: Runtime, archive?: KaneEvidence): ScenarioTrace {
  const observations: Observation[] = [];
  const stepsSkipped: number[] = [];
  const priorStateKeys = new Set<string>();
  let lastStepIndex = -1;
  let streamStarted = false;
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
        if (streamStarted || lastStepIndex >= 0 || summary || (event.surface !== undefined && event.surface !== 'testmd')) {
          throw new Error(`Unexpected Kane stream header at line ${lineIndex + 1}.`);
        }
        streamStarted = true;
        kaneVersion = text(event.cli_version);
        break;
      case 'test_md_step_start': {
        const index = (count(event.step_index) ?? 0) - 1;
        if (active || index <= lastStepIndex || !scenario.steps[index] || summary || done) {
          throw new Error(`Invalid Kane step start at line ${lineIndex + 1}.`);
        }
        lastStepIndex = index;
        active = { index, runEnds: 0, actionRecorded: null, screenshotRef: null, evidenceRef: null };
        break;
      }
      case 'step_event': {
        if (!active || active.runEnds !== 0 || event.event !== 'action' || typeof event.success !== 'boolean') break;
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
        if (active?.actionIndex !== undefined && active.runEnds === 0 && active.actionIndex === count(event.index)) {
          const actionId = text(event.action_id);
          if (archive) {
            const ordinal = count(event.ordinal);
            const stepId = text(event.id);
            const artifact = ordinal !== null && stepId ? archive.actions.get(`${ordinal}-${stepId}`) : undefined;
            if (artifact && artifact.actionId === actionId && artifact.kind === event.kind) {
              active.screenshotRef = artifact.screenshotRef;
              active.evidenceRef = artifact.evidenceRef;
            }
          } else {
            active.screenshotRef = text(event.screenshot);
            active.evidenceRef = actionId;
          }
        }
        break;
      case 'run_end':
        if (active) {
          for (const key of Object.keys(active.finalState ?? {})) priorStateKeys.add(key);
          active.runEnds++;
          active.runId = text(event.run_id) ?? undefined;
          active.finalState = object(event.final_state);
          active.innerRunUsable = event.status === undefined || event.status === 'passed';
        }
        break;
      case 'test_md_step_end': {
        const index = (count(event.step_index) ?? 0) - 1;
        const step = scenario.steps[index];
        if (event.status === 'skipped' && step && !summary && !done &&
          (active?.index === index || (!active && index > lastStepIndex))) {
          lastStepIndex = index;
          for (const key of Object.keys(active?.finalState ?? {})) priorStateKeys.add(key);
          stepsSkipped.push(index);
          active = undefined;
          break;
        }
        if (!active || active.index !== index || !step) throw new Error(`Invalid Kane step end at line ${lineIndex + 1}.`);
        const completeStep = event.status === 'passed' && event.failed_sub_step_index == null &&
          active.runEnds === 1 && active.innerRunUsable === true;
        const actionKind = actionForStep(step, index);
        const archivedRefresh = actionKind === 'reload' && active.runId && !active.evidenceRef
          ? archive?.refreshes.get(active.runId) : undefined;
        if (completeStep && archivedRefresh) {
          active.actionRecorded = true;
          active.evidenceRef = archivedRefresh;
        }
        const state = completeStep ? active.finalState : undefined;
        const logValues = active.runId ? archive?.recordings?.get(active.runId) : undefined;
        const values = Object.fromEntries(Object.keys(step.record).map((key) => {
          if (!completeStep || priorStateKeys.has(key)) return [key, null];
          const logged = logValues?.get(key);
          if (!state || !Object.hasOwn(state, key)) return [key, logged ?? null];
          const final = recordedValue(state[key]);
          return [key, logged !== undefined && logged !== final ? null : final];
        }));
        for (const key of Object.keys(active.finalState ?? {})) priorStateKeys.add(key);
        for (const key of logValues?.keys() ?? []) priorStateKeys.add(key);
        observations.push({
          stepIndex: index, stepId: step.id, actionKind,
          actionRecorded: completeStep && !(archive && active.actionRecorded === true && !active.evidenceRef)
            ? active.actionRecorded : null,
          targetAgreement: 'unknown', values,
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
  const reportedTotal = count(summarySteps?.total);
  const statusesAgree = summary?.overall_status === undefined || done?.overall_status === undefined ||
    summary.overall_status === done.overall_status;
  const completed = streamStarted && done !== undefined && statusesAgree && summary?.cancelled !== true &&
    object(summary?.upload)?.succeeded !== false && (reportedSkips === null || reportedSkips === stepsSkipped.length) &&
    (reportedTotal === null || reportedTotal === observations.length + stepsSkipped.length);
  return {
    scenarioId: scenario.id,
    run: {
      ...runtime, completed, kaneVersion, executionId: archive?.executionId ?? text(done?.execution_id), stepsSkipped,
      replayDecisions: count(summarySteps?.replay_decisions), authorDecisions: count(summarySteps?.author_decisions),
    },
    observations,
  };
}
