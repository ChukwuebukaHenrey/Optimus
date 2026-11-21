import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateScenario } from '../src/core/evaluate.js';
import { loadPack } from '../src/core/pack.js';
import { parseKaneNdjson } from '../src/kane/parse.js';

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
    expect(parsed.run).toMatchObject({ completed: true, replayDecisions: 0, authorDecisions: 2, kaneVersion: 'fixture', executionId: 'example' });
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
  });

  it('rejects corrupt event streams', () => {
    expect(() => parseKaneNdjson(`${encode(open)}\nnot JSON`, scenario, runtime)).toThrow('line 7');
    expect(() => parseKaneNdjson(encode([...open, open[1]]), scenario, runtime)).toThrow('step start');
  });
});
