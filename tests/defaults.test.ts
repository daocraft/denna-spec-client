import { describe, it, expect } from 'vitest';
import { hydrateDefaults } from '../src/defaults.js';

describe('hydrateDefaults', () => {
  it('fills missing string with empty string', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        label: { type: 'string' },
      },
    };
    const data = { name: 'hello' };
    hydrateDefaults(data, schema);
    expect(data).toEqual({ name: 'hello', label: '' });
  });

  it('fills missing number with 0', () => {
    const schema = {
      type: 'object',
      properties: {
        count: { type: 'number' },
        total: { type: 'integer' },
      },
    };
    const data: Record<string, unknown> = {};
    hydrateDefaults(data, schema);
    expect(data).toEqual({ count: 0, total: 0 });
  });

  it('fills missing boolean with false', () => {
    const schema = {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
      },
    };
    const data: Record<string, unknown> = {};
    hydrateDefaults(data, schema);
    expect(data).toEqual({ enabled: false });
  });

  it('fills missing array with empty array', () => {
    const schema = {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'string' } },
      },
    };
    const data: Record<string, unknown> = {};
    hydrateDefaults(data, schema);
    expect(data).toEqual({ items: [] });
  });

  it('fills missing object and recurses into its properties', () => {
    const schema = {
      type: 'object',
      properties: {
        nested: {
          type: 'object',
          properties: {
            value: { type: 'number' },
          },
        },
      },
    };
    const data: Record<string, unknown> = {};
    hydrateDefaults(data, schema);
    expect(data).toEqual({ nested: { value: 0 } });
  });

  it('does not overwrite existing values', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        count: { type: 'number' },
      },
    };
    const data = { name: 'existing', count: 42 };
    hydrateDefaults(data, schema);
    expect(data).toEqual({ name: 'existing', count: 42 });
  });

  it('does not add properties not in schema', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    const data = { name: 'hello', extra: 'value' };
    hydrateDefaults(data, schema);
    expect(data).toEqual({ name: 'hello', extra: 'value' });
  });

  it('skips fields that have Ajv-applied defaults', () => {
    const schema = {
      type: 'object',
      properties: {
        status: { type: 'string', default: 'active' },
      },
    };
    // Simulate Ajv already applied the default
    const data = { status: 'active' };
    hydrateDefaults(data, schema);
    expect(data).toEqual({ status: 'active' });
  });
});
