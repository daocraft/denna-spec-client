import { describe, it, expect, afterEach } from 'vitest';
import { resolve } from 'path';
import { readFile, rm } from 'fs/promises';
import { execSync } from 'child_process';

const FIXTURES = resolve(import.meta.dirname, '../fixtures');
const CLI = resolve(import.meta.dirname, '../../src/cli/index.ts');

describe('denna sync', () => {
  const outputPath = resolve(FIXTURES, 'generated/denna-types.ts');

  afterEach(async () => {
    try {
      await rm(resolve(FIXTURES, 'generated'), { recursive: true });
    } catch {
      // ignore
    }
  });

  it('generates types from config schemas', async () => {
    execSync(
      `npx tsx ${CLI} sync --config ${resolve(FIXTURES, 'denna.config.json')}`,
      { cwd: resolve(FIXTURES), encoding: 'utf-8' },
    );

    // Check output file was created
    const content = await readFile(outputPath, 'utf-8');
    expect(content).toContain('AUTO-GENERATED');
    expect(content).toContain('export interface');
  });
});
