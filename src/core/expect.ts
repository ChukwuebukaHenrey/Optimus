import { substituteNonce, substitutePattern, type Assertion } from './pack.js';

type RecordedValues = Readonly<Partial<Record<string, string | null>>>;

export interface AssertionResult {
  outcome: 'pass' | 'fail' | 'inconclusive';
  expected: unknown;
  observed: string | null;
  unavailableKey?: string;
}

export function normalizeText(value: string, mode?: 'exact' | 'insensitive'): string {
  const normalized = value.trim().replace(/\s+/gu, ' ');
  return mode === 'exact' ? normalized : normalized.toLowerCase();
}

interface Decimal {
  digits: bigint;
  scale: number;
}

function decimal(value: string): Decimal {
  const [mantissa, exponent = '0'] = value.split('e');
  const [integer, fraction = ''] = mantissa.split('.');
  return { digits: BigInt(integer + fraction), scale: fraction.length - Number(exponent) };
}

function parseNumber(value: string): Decimal | undefined {
  const text = value.trim();
  if (text.length > 512 || !/^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)$/u.test(text)) return undefined;
  const numeral = text.replaceAll(',', '');
  return Math.abs(Number(numeral)) <= Number.MAX_SAFE_INTEGER ? decimal(numeral) : undefined;
}

export function parseRecordedList(value: string, mode?: 'exact' | 'insensitive'): string[] | undefined {
  if (['', 'none'].includes(normalizeText(value))) return [];
  const entries = value.split('|').map((entry) => normalizeText(entry, mode));
  return entries.includes('') ? undefined : entries;
}

function matchesDelta(after: Decimal, before: Decimal, expected: number): boolean {
  const parts = [after, before, decimal(String(expected))];
  const scale = Math.max(...parts.map((part) => part.scale));
  const [scaledAfter, scaledBefore, scaledExpected] = parts.map(({ digits, scale: places }) => digits * 10n ** BigInt(scale - places));
  return scaledAfter - scaledBefore === scaledExpected;
}

function isCount({ digits, scale }: Decimal): boolean {
  const places = 10n ** BigInt(scale);
  return digits >= 0n && digits % places === 0n && digits / places <= BigInt(Number.MAX_SAFE_INTEGER);
}

export function evaluateAssertion(assertion: Assertion, values: RecordedValues, nonce: string): AssertionResult {
  const observed = values[assertion.value] ?? null;
  const expected = 'arg' in assertion
    ? Array.isArray(assertion.arg)
      ? assertion.arg.map((arg) => substituteNonce(arg, nonce))
      : typeof assertion.arg === 'string' ? substituteNonce(assertion.arg, nonce) : assertion.arg
    : assertion.op === 'delta' ? { from: assertion.from, by: assertion.by } : 'none';

  const unavailable = (key: string): AssertionResult => ({
    outcome: 'inconclusive', expected, observed, unavailableKey: key,
  });
  const result = (passed: boolean): AssertionResult => ({ outcome: passed ? 'pass' : 'fail', expected, observed });
  if (observed === null) return unavailable(assertion.value);

  switch (assertion.op) {
    case 'equals_number':
    case 'count_equals':
    case 'delta': {
      const number = parseNumber(observed);
      if (number === undefined) return unavailable(assertion.value);
      const needsCount = assertion.op === 'count_equals' || (assertion.op === 'delta' && assertion.kind === 'count');
      if (needsCount && !isCount(number)) return unavailable(assertion.value);
      if (assertion.op !== 'delta') return result(matchesDelta(number, { digits: 0n, scale: 0 }, assertion.arg));
      const previous = values[assertion.from];
      const before = previous == null ? undefined : parseNumber(previous);
      if (before === undefined || (needsCount && !isCount(before))) return unavailable(assertion.from);
      return result(matchesDelta(number, before, assertion.by));
    }
    case 'absent':
      return result(['', 'none'].includes(normalizeText(observed)));
    case 'matches': {
      const pattern = substitutePattern(assertion.arg, nonce);
      return result(new RegExp(pattern, assertion.case === 'exact' ? 'u' : 'iu').test(normalizeText(observed, 'exact')));
    }
    case 'one_of':
      return result(assertion.arg.some((arg) => normalizeText(substituteNonce(arg, nonce), assertion.case) === normalizeText(observed, assertion.case)));
    case 'list_contains':
    case 'list_not_contains': {
      const entries = parseRecordedList(observed, assertion.case);
      if (!entries) return unavailable(assertion.value);
      const contains = entries.includes(normalizeText(substituteNonce(assertion.arg, nonce), assertion.case));
      return result(assertion.op === 'list_contains' ? contains : !contains);
    }
    default: {
      const actual = normalizeText(observed, assertion.case);
      const target = normalizeText(substituteNonce(assertion.arg, nonce), assertion.case);
      if (assertion.op === 'equals') return result(actual === target);
      return result(assertion.op === 'contains' ? actual.includes(target) : !actual.includes(target));
    }
  }
}
