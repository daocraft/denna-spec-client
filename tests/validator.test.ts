import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { readFile } from 'fs/promises';
import { createValidator } from '../src/validator.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('createValidator', () => {
  let validator: Awaited<ReturnType<typeof createValidator>>;

  beforeAll(async () => {
    validator = createValidator();

    // Pre-load referenced schema so Ajv resolves $ref without network access.
    // The rates fixture uses $ref: "./denna-types.schema.json" which Ajv resolves
    // relative to the schema's $id (https://spec.denna.io/v1/defi/rates.schema.json)
    // producing https://spec.denna.io/v1/defi/denna-types.schema.json.
    const typesPath = resolve(FIXTURES, 'schemas/denna-types.schema.json');
    const typesSchema = JSON.parse(await readFile(typesPath, 'utf-8'));
    // Register with the URL that Ajv resolves from the rates schema's $ref.
    // The rates $id is .../v1/defi/rates.schema.json and $ref is ./denna-types.schema.json,
    // so Ajv resolves to https://spec.denna.io/v1/defi/denna-types.schema.json.
    validator.addSchema(typesSchema, 'https://spec.denna.io/v1/defi/denna-types.schema.json');
  });

  it('validates a correct data object against its schema', async () => {
    const schemaPath = resolve(FIXTURES, 'schemas/rates.schema.json');
    const schema = JSON.parse(await readFile(schemaPath, 'utf-8'));
    const data = {
      "$schema": schemaPath,
      "metadata": { "kind": "io.denna.defi.rates" },
      "rates": { "ssrSpread": { "value": 30, "unit": "bps" } },
    };

    const result = await validator.validate(data, schema);
    expect(result.valid).toBe(true);
  });

  it('rejects an invalid data object with error details', async () => {
    const schemaPath = resolve(FIXTURES, 'schemas/rates.schema.json');
    const schema = JSON.parse(await readFile(schemaPath, 'utf-8'));
    const data = {
      "$schema": schemaPath,
      "metadata": { "kind": "io.denna.defi.rates" },
      "rates": { "bad": { "value": "not-a-number", "unit": "bps" } },
    };

    const result = await validator.validate(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].path).toBeDefined();
    expect(result.errors[0].message).toBeDefined();
  });

  it('applies useDefaults for fields with default values', async () => {
    const schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        name: { type: 'string', default: 'untitled' },
        count: { type: 'number' },
      },
      additionalProperties: false,
    };
    const data: Record<string, unknown> = { count: 5 };

    const result = await validator.validate(data, schema);
    expect(result.valid).toBe(true);
    expect(data.name).toBe('untitled'); // Ajv mutates with useDefaults
  });
});
