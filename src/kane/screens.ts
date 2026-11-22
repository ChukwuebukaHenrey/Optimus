import type { ScenarioTrace } from '../core/types.js';

/**
 * Maps each outer step index to the archive entry of the last screenshot Kane took during that step.
 * This shows the page after the step. A trace's own screenshot belongs to the recorded action and can
 * predate the action's effect.
 */
export function lastStepScreenshots(ndjson: string, trace: ScenarioTrace): Map<number, string> {
  const prefix = trace.observations.map(({ screenshotRef }) => screenshotRef?.split('/steps/')[0]).find(Boolean);
  const screens = new Map<number, string>();
  if (!prefix) return screens;
  let current = -1;
  for (const line of ndjson.split(/\r?\n/u)) {
    if (!line.trim()) continue;
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (event.type === 'test_md_step_start' && Number.isSafeInteger(event.step_index)) current = Number(event.step_index) - 1;
    if (current >= 0 && event.type === 'step_end' && typeof event.screenshot === 'string' && typeof event.id === 'string' &&
      Number.isSafeInteger(event.ordinal) && !/[\\/]/u.test(event.screenshot) && /^[\w.-]+$/u.test(event.id)) {
      screens.set(current, `${prefix}/steps/${String(event.ordinal)}-${event.id}/${event.screenshot}`);
    }
  }
  return screens;
}
