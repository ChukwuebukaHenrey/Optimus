import { describe, expect, it } from 'vitest';
import { evaluateAssertion } from '../src/core/expect.js';
import type { Assertion } from '../src/core/pack.js';

type AssertionCase = [Assertion, string | null, 'pass' | 'fail' | 'inconclusive', string?];
const cases: AssertionCase[] = [
  [{ op: 'equals', value: 'x', arg: 'hello world' }, ' HELLO\n  World ', 'pass'],
  [{ op: 'equals', value: 'x', arg: 'hello', case: 'exact' }, 'Hello', 'fail'],
  [{ op: 'equals_number', value: 'x', arg: 19 }, '19.0', 'pass'],
  [{ op: 'equals_number', value: 'x', arg: 1200 }, '1,200', 'pass'],
  [{ op: 'equals_number', value: 'x', arg: 1200 }, '12,00', 'inconclusive'],
  [{ op: 'contains', value: 'x', arg: 'Item {{nonce}}' }, 'first, ITEM RUN-1', 'pass'],
  [{ op: 'not_contains', value: 'x', arg: 'orange' }, 'apples', 'pass'],
  [{ op: 'one_of', value: 'x', arg: ['ready', 'done'] }, ' Done ', 'pass'],
  [{ op: 'matches', value: 'x', arg: '^item {{nonce}}$' }, ' ITEM RUN-1 ', 'pass'],
  [{ op: 'list_contains', value: 'x', arg: 'Green' }, 'red | GREEN | blue', 'pass'],
  [{ op: 'list_contains', value: 'x', arg: 'Green' }, 'green apple', 'fail'],
  [{ op: 'list_contains', value: 'x', arg: 'Green' }, 'green || red', 'inconclusive'],
  [{ op: 'list_not_contains', value: 'x', arg: 'Green' }, 'none', 'pass'],
  [{ op: 'count_equals', value: 'x', arg: 2 }, '2', 'pass'],
  [{ op: 'count_equals', value: 'x', arg: 2 }, '2.2', 'inconclusive'],
  [{ op: 'delta', value: 'x', from: 'before', by: -1 }, '4', 'pass', '5'],
  [{ op: 'delta', value: 'x', from: 'before', by: 0.1 }, '5.1', 'pass', '5.0'],
  [{ op: 'delta', value: 'x', from: 'before', by: 1 }, '4', 'inconclusive'],
  [{ op: 'absent', value: 'x' }, 'None', 'pass'],
  [{ op: 'absent', value: 'x' }, 'something', 'fail'],
  [{ op: 'absent', value: 'x' }, null, 'inconclusive'],
];

describe('assertions', () => {
  it.each(cases)('%j with %j returns %s', (assertion, value, outcome, before) => {
    expect(evaluateAssertion(assertion, { x: value, before }, 'run-1').outcome).toBe(outcome);
  });
});
