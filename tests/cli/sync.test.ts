import { describe, it, expect, afterEach } from 'vitest';
import { resolve } from 'path';
import { readFile, rm } from 'fs/promises';
import { execSync } from 'child_process';

const FIXTURES = resolve(import.meta.dirname, '../fixtures');
const CLI = resolve(import.meta.dirname, '../../src/cli/index.ts');

describe('denna sync', () => {
  const outputDir = resolve(FIXTURES, 'generated');

  afterEach(async () => {
    try {
      await rm(outputDir, { recursive: true });
    } catch {
      // ignore
    }
  });

  it('generates type tree from config schemas', async () => {
    execSync(
      `npx tsx ${CLI} sync --config ${resolve(FIXTURES, 'denna.config.json')}`,
      { cwd: resolve(FIXTURES), encoding: 'utf-8' },
    );

    // Check type file was created at the $id-derived path
    const ratesPath = resolve(outputDir, 'v1/defi/rates.ts');
    const content = await readFile(ratesPath, 'utf-8');
    expect(content).toContain('AUTO-GENERATED');
    expect(content).toContain('export interface');
  });

  it('generates index files for re-exports', async () => {
    execSync(
      `npx tsx ${CLI} sync --config ${resolve(FIXTURES, 'denna.config.json')}`,
      { cwd: resolve(FIXTURES), encoding: 'utf-8' },
    );

    const indexPath = resolve(outputDir, 'index.ts');
    const content = await readFile(indexPath, 'utf-8');
    expect(content).toContain('export');
  });
});
