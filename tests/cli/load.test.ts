import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { execSync } from 'child_process';

const FIXTURES = resolve(import.meta.dirname, '../fixtures');
const CLI = resolve(import.meta.dirname, '../../src/cli/index.ts');

describe('denna load', () => {
  it('prints validated JSON to stdout', () => {
    const output = execSync(
      `npx tsx ${CLI} load ${resolve(FIXTURES, 'data/valid-rates.denna-spec.json')} --config ${resolve(FIXTURES, 'denna.config.json')}`,
      { encoding: 'utf-8' },
    );

    const parsed = JSON.parse(output);
    expect(parsed.metadata.kind).toBe('io.denna.defi.rates');
    expect(parsed.rates.ssrSpread.value).toBe(30);
  });

  it('prints compact JSON with --compact flag', () => {
    const output = execSync(
      `npx tsx ${CLI} load ${resolve(FIXTURES, 'data/valid-rates.denna-spec.json')} --compact --config ${resolve(FIXTURES, 'denna.config.json')}`,
      { encoding: 'utf-8' },
    );

    // Compact JSON has no newlines within the object
    expect(output.trim().split('\n').length).toBe(1);
  });

  it('exits non-zero for invalid file', () => {
    expect(() =>
      execSync(
        `npx tsx ${CLI} load ${resolve(FIXTURES, 'data/invalid-rates.denna-spec.json')} --config ${resolve(FIXTURES, 'denna.config.json')}`,
        { encoding: 'utf-8' },
      ),
    ).toThrow();
  });
});
