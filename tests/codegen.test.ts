import { describe, it, expect, afterEach } from 'vitest';
import { resolve } from 'path';
import { rm } from 'fs/promises';
import { generateTypes, generateTypesTree } from '../src/codegen.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('generateTypes', () => {
  it('generates TypeScript from a local schema', async () => {
    const output = await generateTypes({
      schemas: [resolve(FIXTURES, 'schemas/rates.schema.json')],
    });

    expect(output).toContain('export interface');
    expect(output).toContain('AUTO-GENERATED');
    expect(output).toMatch(/interface.*Rates|interface.*IoDennaDefiRates/i);
  });

  it('generates SchemaTypeMap', async () => {
    const output = await generateTypes({
      schemas: [resolve(FIXTURES, 'schemas/rates.schema.json')],
    });

    expect(output).toContain('SchemaTypeMap');
  });

  it('throws for unreachable schema', async () => {
    await expect(
      generateTypes({ schemas: ['/nonexistent/schema.json'] })
    ).rejects.toThrow();
  });
});

describe('generateTypesTree', () => {
  const outputDir = resolve(FIXTURES, 'generated-tree');

  afterEach(async () => {
    try {
      await rm(outputDir, { recursive: true });
    } catch {
      // ignore
    }
  });

  it('generates separate files based on schema $id', async () => {
    const files = await generateTypesTree({
      schemas: [
        resolve(FIXTURES, 'schemas/rates.schema.json'),
        resolve(FIXTURES, 'schemas/address-registry.schema.json'),
      ],
      outputDir,
    });

    const typePaths = files.map((f) => f.relativePath).filter((p) => !p.endsWith('index.ts'));
    expect(typePaths).toContain('v1/defi/rates.ts');
    expect(typePaths).toContain('v1/defi/address-registry.ts');
  });

  it('derives root type name from filename, not schema title', async () => {
    const files = await generateTypesTree({
      schemas: [resolve(FIXTURES, 'schemas/rates.schema.json')],
      outputDir,
    });

    const ratesFile = files.find((f) => f.relativePath === 'v1/defi/rates.ts');
    expect(ratesFile).toBeDefined();
    // Root interface should be "Rates" (from filename), not "IoDennaDefiRates" (from title)
    expect(ratesFile!.content).toMatch(/export interface Rates \{/);
  });

  it('generates index.ts files at each directory level', async () => {
    const files = await generateTypesTree({
      schemas: [
        resolve(FIXTURES, 'schemas/rates.schema.json'),
        resolve(FIXTURES, 'schemas/address-registry.schema.json'),
      ],
      outputDir,
    });

    const indexPaths = files.map((f) => f.relativePath).filter((p) => p.endsWith('index.ts'));
    expect(indexPaths).toContain('index.ts');
    // No domain-level index since hostname is stripped
    expect(indexPaths).toContain('v1/index.ts');
    expect(indexPaths).toContain('v1/defi/index.ts');
  });

  it('index files use namespace re-exports', async () => {
    const files = await generateTypesTree({
      schemas: [
        resolve(FIXTURES, 'schemas/rates.schema.json'),
        resolve(FIXTURES, 'schemas/address-registry.schema.json'),
      ],
      outputDir,
    });

    const defiIndex = files.find((f) => f.relativePath === 'v1/defi/index.ts');
    expect(defiIndex).toBeDefined();
    expect(defiIndex!.content).toContain("export * as Rates from './rates.js'");
    expect(defiIndex!.content).toContain("export * as AddressRegistry from './address-registry.js'");

    const v1Index = files.find((f) => f.relativePath === 'v1/index.ts');
    expect(v1Index).toBeDefined();
    expect(v1Index!.content).toContain("export * as Defi from './defi/index.js'");
  });

  it('type files contain no duplicate identifiers across schemas', async () => {
    const files = await generateTypesTree({
      schemas: [
        resolve(FIXTURES, 'schemas/rates.schema.json'),
        resolve(FIXTURES, 'schemas/address-registry.schema.json'),
      ],
      outputDir,
    });

    const ratesFile = files.find((f) => f.relativePath === 'v1/defi/rates.ts');
    const registryFile = files.find((f) => f.relativePath === 'v1/defi/address-registry.ts');

    expect(ratesFile).toBeDefined();
    expect(registryFile).toBeDefined();
    expect(ratesFile!.content).toContain('export interface');
    expect(registryFile!.content).toContain('export interface');
  });
});
