import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { loadConfig, discoverConfig } from '../src/config.js';
import { DennaLoadError, DennaParseError } from '../src/errors.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('loadConfig', () => {
  it('loads and parses a valid config file', async () => {
    const config = await loadConfig(resolve(FIXTURES, 'denna.config.json'));
    expect(config.schemas).toContain('./schemas/rates.schema.json');
    expect(config.output).toBe('./generated');
    expect(config.sources?.local).toEqual({
      type: 'filesystem',
      path: './data',
    });
  });

  it('throws DennaLoadError for missing file', async () => {
    await expect(loadConfig('/nonexistent/denna.config.json'))
      .rejects.toBeInstanceOf(DennaLoadError);
  });

  it('throws DennaParseError for invalid JSON', async () => {
    await expect(loadConfig(resolve(FIXTURES, 'data/not-json.txt')))
      .rejects.toBeInstanceOf(DennaParseError);
  });
});

describe('discoverConfig', () => {
  it('finds denna.config.json walking up from a subdirectory', async () => {
    const configPath = await discoverConfig(resolve(FIXTURES, 'data'));
    expect(configPath).toBe(resolve(FIXTURES, 'denna.config.json'));
  });

  it('returns null when no config found', async () => {
    const configPath = await discoverConfig('/');
    expect(configPath).toBeNull();
  });
});
