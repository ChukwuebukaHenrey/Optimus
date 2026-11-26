import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoText } from '../src/demo.js';

describe('npm run demo', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('replays the blind repair of U and the 97-run table offline, from committed files only', async () => {
    vi.stubGlobal('fetch', () => { throw new Error('The demo must not use the network.'); });
    const text = await demoText();
    const inOrder = [
      'Optimus verdicts: L1 PASS  L3 PASS  L4 FAIL',
      'FAIL L4 at step "reload": expected "GP Keep c61591-run-0", observed "none".',
      '# Repair brief',
      '+  saveBooks();',
      'workspace outside Optimus ok | contract hash unchanged ok | grader (src/core, src/kane) unchanged ok',
      'Final verdicts: L1 PASS (run-1)  L3 PASS (run-2)  L4 PASS (run-2)',
      'Outcome: COMPLETE.',
      '| passed | 64 | 12 | 2 | 2 |',
      '| U (blind; defect sealed until grading) | L4 persist |',
    ];
    let at = -1;
    for (const line of inOrder) {
      const next = text.indexOf(line, at + 1);
      expect(next, `missing or out of order: ${line}`).toBeGreaterThan(at);
      at = next;
    }
  });

  it('imports nothing that reaches the network, a browser or another process', async () => {
    const source = await readFile('src/demo.ts', 'utf8');
    const imports = [...source.matchAll(/from '([^']+)'/gu)].map(([, module]) => module);
    expect(imports).toEqual(['node:fs/promises', 'node:path', 'node:url']);
    expect(source).not.toMatch(/\bfetch\(|child_process|kane\//u);
  });
});
