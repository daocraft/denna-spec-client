import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { execSync } from 'child_process';

const FIXTURES = resolve(import.meta.dirname, '../fixtures');
const CLI = resolve(import.meta.dirname, '../../src/cli/index.ts');

describe('denna validate', () => {
  it('reports success for valid file', () => {
    const output = execSync(
      `npx tsx ${CLI} validate ${resolve(FIXTURES, 'data/valid-rates.denna-spec.json')} --config ${resolve(FIXTURES, 'denna.config.json')}`,
      { encoding: 'utf-8' },
    );

    expect(output).toContain('✓');
  });

  it('reports failure for invalid file and exits non-zero', () => {
    expect(() =>
      execSync(
        `npx tsx ${CLI} validate ${resolve(FIXTURES, 'data/invalid-rates.denna-spec.json')} --config ${resolve(FIXTURES, 'denna.config.json')}`,
        { encoding: 'utf-8' },
      ),
    ).toThrow();
  });

  it('validates multiple files', () => {
    expect(() =>
      execSync(
        `npx tsx ${CLI} validate ${resolve(FIXTURES, 'data/valid-rates.denna-spec.json')} ${resolve(FIXTURES, 'data/invalid-rates.denna-spec.json')} --config ${resolve(FIXTURES, 'denna.config.json')}`,
        { encoding: 'utf-8' },
      ),
    ).toThrow(); // exits non-zero because one file is invalid
  });
});
