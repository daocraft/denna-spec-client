import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { generateTypes } from '../src/codegen.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('generateTypes', () => {
  it('generates TypeScript from a local schema', async () => {
    const output = await generateTypes({
      schemas: [resolve(FIXTURES, 'schemas/rates.schema.json')],
    });

    // Should contain an interface
    expect(output).toContain('export interface');
    // Should contain the auto-generated header
    expect(output).toContain('AUTO-GENERATED');
    // Should contain a rates-related type
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
