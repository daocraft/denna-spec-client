import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveSource } from '../src/resolver.js';
import type { DennaConfig } from '../src/config.js';
import type { DennaLockFile } from '../src/lock.js';

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv, SKY_TOKEN: 'ghp_test123' };
});

afterEach(() => {
  process.env = originalEnv;
});

const config: DennaConfig = {
  schemas: [],
  output: 'out.ts',
  sources: {
    sky: {
      type: 'github',
      repo: 'amatsu/sky-parameters',
      ref: 'main',
      tokenEnv: 'SKY_TOKEN',
    },
    pub: {
      type: 'github',
      repo: 'amatsu/public-params',
      ref: 'main',
    },
    local: {
      type: 'filesystem',
      path: '/tmp/params',
    },
  },
};

describe('resolveSource', () => {
  it('resolves github alias to github source type with token', () => {
    const result = resolveSource('sky:spark/protocol-config', config);
    expect(result).toEqual({
      type: 'github',
      repo: 'amatsu/sky-parameters',
      ref: 'main',
      path: 'spark/protocol-config.denna-spec.json',
      token: 'ghp_test123',
    });
  });

  it('resolves github alias without tokenEnv to github source with no token', () => {
    const result = resolveSource('pub:spark/protocol-config', config);
    expect(result).toEqual({
      type: 'github',
      repo: 'amatsu/public-params',
      ref: 'main',
      path: 'spark/protocol-config.denna-spec.json',
      token: undefined,
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

  it('uses locked version tag for github source when lock exists', () => {
    const lock: DennaLockFile = {
      sources: {
        sky: { version: '1.2.0', lockedAt: '2026-03-25T00:00:00Z' },
      },
    };
    const result = resolveSource('sky:spark/protocol-config', config, lock);
    expect(result).toEqual({
      type: 'github',
      repo: 'amatsu/sky-parameters',
      ref: 'v1.2.0',
      path: 'spark/protocol-config.denna-spec.json',
      token: 'ghp_test123',
    });
  });

  it('uses config ref when lock has no entry for alias', () => {
    const lock: DennaLockFile = { sources: {} };
    const result = resolveSource('sky:spark/protocol-config', config, lock);
    expect(result).toEqual({
      type: 'github',
      repo: 'amatsu/sky-parameters',
      ref: 'main',
      path: 'spark/protocol-config.denna-spec.json',
      token: 'ghp_test123',
    });
  });

  it('throws when tokenEnv is set but env var is missing', () => {
    delete process.env.SKY_TOKEN;
    expect(() => resolveSource('sky:spark/protocol-config', config))
      .toThrow('Environment variable "SKY_TOKEN" is not set');
  });
});
