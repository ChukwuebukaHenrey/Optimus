import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateScenario } from '../src/core/evaluate.js';
import { loadPack } from '../src/core/pack.js';
import { parseKaneNdjson } from '../src/kane/parse.js';
import type { KaneEvidence } from '../src/kane/evidence.js';

const loaded = await loadPack(join('packs', 'library'));
const [scenario] = loaded.pack.scenarios;
const runtime = {
  kaneExitCode: 0, evidencePackPath: 'synthetic.evidence', packHash: loaded.packHash,
  nonce: 'demo', appUrl: 'http://localhost:8080',
};

const open = [
  { type: 'stream_start', cli_version: 'fixture' },
  { type: 'test_md_step_start', step_index: 1 },
  { type: 'step_event', event: 'action', action_type: 'navigate', success: true, index: 0 },
  { type: 'step_end', index: 0, screenshot: 'open.png', action_id: 'open-action' },
  { type: 'run_end', final_state: { titles_before: 'none', count_before: 0 } },
  { type: 'test_md_step_end', step_index: 1, status: 'passed' },
];
const add = [
  { type: 'test_md_step_start', step_index: 2 },
  { type: 'step_event', event: 'action', action_type: 'click', success: true, index: 2 },
  { type: 'run_end', final_state: { titles_before: 'unrelated', titles_after: 'GP Book demo', count_after: 1 } },
  { type: 'test_md_step_end', step_index: 2, status: 'passed' },
];
const summary = (replays = 0, skipped = 0) => ({
  type: 'test_md_summary', steps: { replay_decisions: replays, author_decisions: 2 - replays - skipped, skipped },
});
const done = { type: 'test_md_done', session_id: 'example' };
const encode = (events: object[]) => events.map((event) => JSON.stringify(event)).join('\n');

describe('provisional Kane parser', () => {
  it('normalizes only declared recordings from each author step and explicit actions', () => {
    const parsed = parseKaneNdjson(encode([...open, ...add, summary(), done]), scenario, runtime);
    expect(parsed.run).toMatchObject({ completed: true, replayDecisions: 0, authorDecisions: 2, kaneVersion: 'fixture', executionId: null });
    expect(parsed.observations).toEqual([
      { stepIndex: 0, stepId: 'before', actionKind: 'open', targetAgreement: 'unknown', actionRecorded: true,
        values: { titles_before: 'none', count_before: '0' }, screenshotRef: 'open.png', evidenceRef: 'open-action' },
      { stepIndex: 1, stepId: 'add', actionKind: 'interact', targetAgreement: 'unknown', actionRecorded: true,
        values: { titles_after: 'GP Book demo', count_after: '1' }, screenshotRef: null, evidenceRef: null },
    ]);
    expect(evaluateScenario(loaded, parsed).verdict).toBe('PASS');
  });

  it('keeps replay metadata and leaves the replay-only step values missing', () => {
    const replay = add.map((event) => event.type === 'run_end' ? { type: 'run_end', status: 'passed' } : event);
    const parsed = parseKaneNdjson(encode([...open, ...replay, summary(1), done]), scenario, runtime);
    expect(parsed.observations[1].values).toEqual({ titles_after: null, count_after: null });
    expect(evaluateScenario(loaded, parsed).reasonCode).toBe('replay_detected');
  });

  it('distinguishes absent action evidence from an explicit failed action', () => {
    const unknown = add.filter((event) => event.type !== 'step_event');
    const failed = add.map((event) => event.type === 'step_event' ? { ...event, success: false } : event);
    for (const [events, actionRecorded] of [[unknown, null], [failed, false]] as const) {
      const parsed = parseKaneNdjson(encode([...open, ...events, summary(), done]), scenario, runtime);
      expect(parsed.observations[1].actionRecorded).toBe(actionRecorded);
      expect(evaluateScenario(loaded, parsed).verdict).toBe('INCONCLUSIVE');
    }
  });

  it('withholds incomplete step evidence even after a successful preliminary click', () => {
    const partial = add.map((event) => event.type === 'test_md_step_end'
      ? { ...event, status: 'failed', failed_sub_step_index: 2 } : event);
    const parsed = parseKaneNdjson(encode([...open, ...partial, summary(), done]), scenario, runtime);
    expect(parsed.observations[1]).toMatchObject({ actionRecorded: null, values: { titles_after: null, count_after: null } });
    expect(evaluateScenario(loaded, parsed).verdict).toBe('INCONCLUSIVE');
  });

  it('withholds keys that were already present in an earlier cumulative state', () => {
    const premature = open.map((event) => event.type === 'run_end'
      ? { ...event, final_state: { ...event.final_state, titles_after: 'GP Book demo' } } : event);
    const parsed = parseKaneNdjson(encode([...premature, ...add, summary(), done]), scenario, runtime);
    expect(parsed.observations[1].values.titles_after).toBeNull();
    expect(evaluateScenario(loaded, parsed).verdict).toBe('INCONCLUSIVE');
  });

  it('reads explicit named recordings from the matching archive log when final_state uses aliases', () => {
    const aliasState = add.map((event) => event.type === 'run_end' ? {
      ...event, run_id: 'run-1', final_state: { book_titles: 'GP Book demo', book_count: '1' },
    } : event);
    const recordings = new Map([['titles_after', 'GP Book demo'], ['count_after', '1']]);
    const archive: KaneEvidence = {
      executionId: null, actions: new Map(), refreshes: new Map(), recordings: new Map([['run-1', recordings]]),
    };
    const input = encode([...open, ...aliasState, summary(), done]);
    expect(parseKaneNdjson(input, scenario, runtime, archive).observations[1].values)
      .toEqual({ titles_after: 'GP Book demo', count_after: '1' });
    const wrongRun = { ...archive, recordings: new Map([['run-0', recordings]]) };
    expect(parseKaneNdjson(input, scenario, runtime, wrongRun).observations[1].values)
      .toEqual({ titles_after: null, count_after: null });
  });

  it('contradicts a step whose browser ended on another origin than the app', () => {
    const elsewhere = open.map((event) => event.type === 'run_end'
      ? { ...event, final_state: { url: 'https://unrelated.example/', titles_before: 'none', count_before: 0 } } : event);
    const atApp = add.map((event) => event.type === 'run_end'
      ? { ...event, final_state: { url: 'http://localhost:8080/#list', titles_after: 'GP Book demo', count_after: 1 } } : event);
    const parsed = parseKaneNdjson(encode([...elsewhere, ...atApp, summary(), done]), scenario, runtime);
    expect(parsed.observations.map(({ targetAgreement }) => targetAgreement)).toEqual(['contradicted', 'unknown']);
    expect(evaluateScenario(loaded, parsed)).toMatchObject({ verdict: 'INCONCLUSIVE', reasonCode: 'action_target_contradicted', stepId: 'before' });
    const noUrl = parseKaneNdjson(encode([...open, ...add, summary(), done]), scenario, runtime);
    expect(noUrl.observations.map(({ targetAgreement }) => targetAgreement)).toEqual(['unknown', 'unknown']);
  });

  it('accepts an empty list recorded as [] in the log and none in final_state', () => {
    const withRunId = open.map((event) => event.type === 'run_end' ? { ...event, run_id: 'run-0' } : event);
    const archive: KaneEvidence = {
      executionId: null, actions: new Map(), refreshes: new Map(),
      recordings: new Map([['run-0', new Map<string, string | null>([['titles_before', ''], ['count_before', '0']])]]),
    };
    const parsed = parseKaneNdjson(encode([...withRunId, ...add, summary(), done]), scenario, runtime, archive);
    expect(parsed.observations[0].values).toEqual({ titles_before: 'none', count_before: '0' });
  });

  it('withholds recordings when explicit final_state and archive values disagree', () => {
    const withRunId = add.map((event) => event.type === 'run_end' ? { ...event, run_id: 'run-1' } : event);
    const archive: KaneEvidence = {
      executionId: null, actions: new Map(), refreshes: new Map(),
      recordings: new Map([['run-1', new Map([['count_after', '2']])]]),
    };
    const parsed = parseKaneNdjson(encode([...open, ...withRunId, summary(), done]), scenario, runtime, archive);
    expect(parsed.observations[1].values).toEqual({ titles_after: 'GP Book demo', count_after: null });
  });

  it('preserves an explicit skipped step and refuses to guess missing skipped indexes', () => {
    const skipped = { type: 'test_md_step_end', step_index: 2, status: 'skipped' };
    const parsed = parseKaneNdjson(encode([...open, skipped, summary(0, 1), done]), scenario, runtime);
    expect(parsed.run.stepsSkipped).toEqual([1]);
    expect(evaluateScenario(loaded, parsed).verdict).toBe('NOT_RUN');
    expect(parseKaneNdjson(encode([...open, summary(0, 1), done]), scenario, runtime).run.completed).toBe(false);
  });

  it('requires file completion and a usable upload outcome', () => {
    expect(parseKaneNdjson(encode([...open, ...add, summary()]), scenario, runtime).run.completed).toBe(false);
    const failedUpload = { ...summary(), upload: { succeeded: false } };
    expect(parseKaneNdjson(encode([...open, ...add, failedUpload, done]), scenario, runtime).run.completed).toBe(false);
    const passed = { ...summary(), overall_status: 'passed' };
    const failed = { ...done, overall_status: 'failed' };
    expect(parseKaneNdjson(encode([...open, ...add, passed, failed]), scenario, runtime).run.completed).toBe(false);
  });

  it('rejects corrupt event streams', () => {
    expect(() => parseKaneNdjson(`${encode(open)}\nnot JSON`, scenario, runtime)).toThrow('line 7');
    expect(() => parseKaneNdjson(encode([...open, open[1]]), scenario, runtime)).toThrow('step start');
  });

  it('joins the trimmed Phase 1 author stream to archive actions', async () => {
    const fixture = await readFile(join('tests', 'fixtures', 'kane-phase1-l1.ndjson'), 'utf8');
    const openPath = 'tests/fixture/steps/1-0-1/';
    const savePath = 'tests/fixture/steps/12-1-8/';
    const archive: KaneEvidence = {
      executionId: 'fixture-execution',
      actions: new Map([
        ['1-0-1', { actionId: 'open-action', kind: 'navigate', evidenceRef: openPath + 'step.json', screenshotRef: openPath + 'screenshot.jpg' }],
        ['12-1-8', { actionId: 'save-action', kind: 'click', evidenceRef: savePath + 'step.json', screenshotRef: savePath + 'screenshot.jpg' }],
      ]),
      refreshes: new Map(),
    };
    const parsed = parseKaneNdjson(fixture, scenario, { ...runtime, nonce: 'p1a' }, archive);
    expect(parsed.run.executionId).toBe('fixture-execution');
    expect(parsed.observations[1]).toMatchObject({
      actionRecorded: true,
      values: { titles_after: 'GP Book p1a', count_after: '1' },
      evidenceRef: savePath + 'step.json',
      screenshotRef: savePath + 'screenshot.jpg',
    });
    expect(evaluateScenario(loaded, parsed).verdict).toBe('PASS');

    const unlinked = parseKaneNdjson(fixture, scenario, { ...runtime, nonce: 'p1a' }, { ...archive, actions: new Map() });
    expect(unlinked.observations[1]).toMatchObject({ actionRecorded: null, evidenceRef: null, screenshotRef: null });
    expect(evaluateScenario(loaded, unlinked).verdict).toBe('INCONCLUSIVE');
  });

  it('uses archived refreshes only for the exact inner run and keeps repeated action IDs distinct', async () => {
    const fixture = await readFile(join('tests', 'fixtures', 'kane-phase1-l4.ndjson'), 'utf8');
    const scenario = loaded.pack.scenarios.find(({ id }) => id === 'L4')!;
    const navigationRef = 'tests/fixture/steps/1-0-1/step.json';
    const refreshRef = 'tests/fixture/logs/2-actions.ndjson';
    const archive: KaneEvidence = {
      executionId: 'fixture-execution',
      actions: new Map([
        ['1-0-1', { actionId: 'reused-action', kind: 'navigate', evidenceRef: navigationRef, screenshotRef: null }],
        ['13-2-1', { actionId: 'reused-action', kind: 'wait', evidenceRef: 'tests/fixture/steps/13-2-1/step.json', screenshotRef: null }],
        ['10-1-8', { actionId: 'save-action', kind: 'click', evidenceRef: 'tests/fixture/steps/10-1-8/step.json', screenshotRef: null }],
      ]),
      refreshes: new Map([['run-2', refreshRef]]),
    };
    const parsed = parseKaneNdjson(fixture, scenario, { ...runtime, nonce: 'p1b' }, archive);
    expect(parsed.observations[0]).toMatchObject({ actionRecorded: true, evidenceRef: navigationRef });
    expect(parsed.observations[2]).toMatchObject({ actionRecorded: true, evidenceRef: refreshRef, screenshotRef: null });
    expect(evaluateScenario(loaded, parsed).verdict).toBe('PASS');

    const wrongRun = { ...archive, refreshes: new Map([['run-1', refreshRef]]) };
    const unlinked = parseKaneNdjson(fixture, scenario, { ...runtime, nonce: 'p1b' }, wrongRun);
    expect(evaluateScenario(loaded, unlinked)).toMatchObject({ verdict: 'INCONCLUSIVE', stepId: 'reload' });
  });
});
