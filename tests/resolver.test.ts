import { describe, it, expect } from 'vitest';
import { resolveSource } from '../src/resolver.js';
import type { DennaConfig } from '../src/config.js';

const config: DennaConfig = {
  schemas: [],
  output: 'out.ts',
  sources: {
    sky: {
      type: 'github',
      repo: 'amatsu/sky-parameters',
      ref: 'main',
    },
    local: {
      type: 'filesystem',
      path: '/tmp/params',
    },
  },
};

describe('resolveSource', () => {
  it('resolves github alias without glob', () => {
    const result = resolveSource('sky:spark/protocol-config', config);
    expect(result).toEqual({
      type: 'url',
      url: 'https://raw.githubusercontent.com/amatsu/sky-parameters/main/spark/protocol-config.denna-spec.json',
    });
  });

  it('resolves github alias with glob (no extension appended)', () => {
    const result = resolveSource('sky:spark/*', config);
    expect(result).toEqual({
      type: 'glob',
      source: config.sources!.sky,
      pattern: 'spark/*',
    });
  });

  it('resolves filesystem alias without glob', () => {
    const result = resolveSource('local:shared/rates', config);
    expect(result).toEqual({
      type: 'file',
      path: '/tmp/params/shared/rates.denna-spec.json',
    });
  });

  it('resolves filesystem alias with glob', () => {
    const result = resolveSource('local:shared/*', config);
    expect(result).toEqual({
      type: 'glob',
      source: config.sources!.local,
      pattern: 'shared/*',
    });
  });

  it('resolves absolute file paths', () => {
    const result = resolveSource('/tmp/file.denna-spec.json', config);
    expect(result).toEqual({
      type: 'file',
      path: '/tmp/file.denna-spec.json',
    });
  });

  it('resolves relative file paths', () => {
    const result = resolveSource('./data/rates.denna-spec.json', config);
    expect(result).toEqual({
      type: 'file',
      path: './data/rates.denna-spec.json',
    });
  });

  it('resolves URLs directly', () => {
    const url = 'https://example.com/data.denna-spec.json';
    const result = resolveSource(url, config);
    expect(result).toEqual({ type: 'url', url });
  });

  it('throws for unknown alias', () => {
    expect(() => resolveSource('unknown:path', config))
      .toThrow('Unknown source alias');
  });

  it('works without config for direct paths', () => {
    const result = resolveSource('./file.denna-spec.json', null);
    expect(result).toEqual({
      type: 'file',
      path: './file.denna-spec.json',
    });
  });

  it('throws for alias when no config', () => {
    expect(() => resolveSource('sky:path', null))
      .toThrow();
  });
});
