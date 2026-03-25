import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { expandGlob } from '../src/glob.js';
import type { DennaConfig } from '../src/config.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

const config: DennaConfig = {
  schemas: [],
  output: 'out.ts',
  sources: {
    local: {
      type: 'filesystem',
      path: resolve(FIXTURES, 'data'),
    },
  },
};

describe('expandGlob', () => {
  it('expands filesystem glob pattern', async () => {
    const sources = await expandGlob('local:*', config);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((s) => s.endsWith('.denna-spec.json'))).toBe(true);
  });

  it('returns single source for non-glob input', async () => {
    const sources = await expandGlob('local:valid-rates', config);
    expect(sources).toEqual([
      resolve(FIXTURES, 'data/valid-rates.denna-spec.json'),
    ]);
  });

  it('expands local file glob pattern', async () => {
    const sources = await expandGlob(
      resolve(FIXTURES, 'data/*.denna-spec.json'),
      config,
    );
    expect(sources.length).toBeGreaterThan(0);
  });
});
