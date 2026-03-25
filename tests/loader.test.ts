import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { DennaSpec } from '../src/loader.js';
import { DennaValidationError, DennaLoadError } from '../src/errors.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('DennaSpec', () => {
  it('loads and validates a valid denna-spec file', async () => {
    const denna = new DennaSpec({ config: resolve(FIXTURES, 'denna.config.json') });
    const data = await denna.load(resolve(FIXTURES, 'data/valid-rates.denna-spec.json'));

    expect(data.$schema).toBeDefined();
    expect(data.metadata.kind).toBe('io.denna.defi.rates');
    expect(data.rates.ssrSpread.value).toBe(30);
  });

  it('throws DennaValidationError for invalid data', async () => {
    const denna = new DennaSpec({ config: resolve(FIXTURES, 'denna.config.json') });

    await expect(
      denna.load(resolve(FIXTURES, 'data/invalid-rates.denna-spec.json'))
    ).rejects.toBeInstanceOf(DennaValidationError);
  });

  it('throws DennaLoadError for missing file', async () => {
    const denna = new DennaSpec({ config: resolve(FIXTURES, 'denna.config.json') });

    await expect(
      denna.load('/nonexistent/file.denna-spec.json')
    ).rejects.toBeInstanceOf(DennaLoadError);
  });

  it('hydrates default values for missing optional fields', async () => {
    const denna = new DennaSpec({ config: resolve(FIXTURES, 'denna.config.json') });
    const data = await denna.load(resolve(FIXTURES, 'data/valid-rates.denna-spec.json'));

    // The valid fixture has only rates.ssrSpread — optional arrays should be hydrated to []
    expect(data.fallbackRates).toEqual([]);
    expect(data.rateHierarchy).toEqual([]);
    expect(data.subsidyPrograms).toEqual([]);
    expect(data.externalDataSources).toEqual([]);
  });

  it('works without config using direct paths', async () => {
    const denna = new DennaSpec({ config: false });
    const data = await denna.load(resolve(FIXTURES, 'data/valid-rates.denna-spec.json'));

    expect(data.metadata.kind).toBe('io.denna.defi.rates');
  });
});
