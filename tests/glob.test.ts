import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { resolve } from 'path';
import { expandGlob } from '../src/glob.js';
import type { DennaConfig } from '../src/config.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

const originalEnv = process.env;

const config: DennaConfig = {
  schemas: [],
  output: 'out.ts',
  sources: {
    local: {
      type: 'filesystem',
      path: resolve(FIXTURES, 'data'),
    },
  },
};

describe('expandGlob', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('expands filesystem glob pattern', async () => {
    const sources = await expandGlob('local:*', config);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((s) => s.endsWith('.denna-spec.json'))).toBe(true);
  });

  it('returns single source for non-glob input', async () => {
    const sources = await expandGlob('local:valid-rates', config);
    expect(sources).toEqual([
      resolve(FIXTURES, 'data/valid-rates.denna-spec.json'),
    ]);
  });

  it('expands local file glob pattern', async () => {
    const sources = await expandGlob(
      resolve(FIXTURES, 'data/*.denna-spec.json'),
      config,
    );
    expect(sources.length).toBeGreaterThan(0);
  });

  it('expands github glob using githubListDir with token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { name: 'protocol-config.denna-spec.json', type: 'file' },
          { name: 'pnl-config.denna-spec.json', type: 'file' },
          { name: 'README.md', type: 'file' },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const ghConfig: DennaConfig = {
      schemas: [],
      output: 'out.ts',
      sources: {
        sky: {
          type: 'github',
          repo: 'org/repo',
          ref: 'main',
          tokenEnv: 'TEST_GH_TOKEN',
        },
      },
    };

    process.env.TEST_GH_TOKEN = 'ghp_test';
    const result = await expandGlob('sky:spark/*', ghConfig);

    // Returns alias:path format (sans .denna-spec.json) for re-resolution
    expect(result).toEqual([
      'sky:spark/protocol-config',
      'sky:spark/pnl-config',
    ]);

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect((opts?.headers as Record<string, string>).Authorization).toBe('Bearer ghp_test');
  });

  it('expands github glob without token for public repos', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { name: 'config.denna-spec.json', type: 'file' },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const ghConfig: DennaConfig = {
      schemas: [],
      output: 'out.ts',
      sources: {
        pub: {
          type: 'github',
          repo: 'org/public-repo',
          ref: 'main',
        },
      },
    };

    const result = await expandGlob('pub:*', ghConfig);
    expect(result).toEqual(['pub:config']);

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect((opts?.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('returns original input for non-glob github alias', async () => {
    process.env.TEST_GH_TOKEN = 'ghp_test';
    const ghConfig: DennaConfig = {
      schemas: [],
      output: 'out.ts',
      sources: {
        sky: {
          type: 'github',
          repo: 'org/repo',
          ref: 'main',
          tokenEnv: 'TEST_GH_TOKEN',
        },
      },
    };

    const result = await expandGlob('sky:spark/protocol-config', ghConfig);
    expect(result).toEqual(['sky:spark/protocol-config']);
  });
});
