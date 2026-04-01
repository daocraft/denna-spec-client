import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolve } from 'path';
import { writeFile, rm, mkdir } from 'fs/promises';
import { getLockedRef, readLockFile, writeLockFile, resolveSourceVersion, type DennaLockFile } from '../src/lock.js';
import type { GithubSource } from '../src/config.js';

const TMP = resolve(import.meta.dirname, 'fixtures/tmp-lock');

describe('getLockedRef', () => {
  const source: GithubSource = { type: 'github', repo: 'org/repo', ref: 'main' };

  it('returns config ref when no lock', () => {
    expect(getLockedRef(source, 'sky', null)).toBe('main');
  });

  it('returns config ref when alias not in lock', () => {
    const lock: DennaLockFile = { sources: {} };
    expect(getLockedRef(source, 'sky', lock)).toBe('main');
  });

  it('returns versioned tag when alias is locked', () => {
    const lock: DennaLockFile = {
      sources: {
        sky: { version: '1.2.0', lockedAt: '2026-03-25T00:00:00Z' },
      },
    };
    expect(getLockedRef(source, 'sky', lock)).toBe('v1.2.0');
  });
});

describe('readLockFile / writeLockFile', () => {
  const configPath = resolve(TMP, 'denna.config.json');

  afterEach(async () => {
    try {
      await rm(TMP, { recursive: true });
    } catch {
      // ignore
    }
  });

  it('returns null when no lock file exists', async () => {
    const result = await readLockFile('/nonexistent/denna.config.json');
    expect(result).toBeNull();
  });

  it('round-trips a lock file', async () => {
    await mkdir(TMP, { recursive: true });
    await writeFile(configPath, '{}', 'utf-8');

    const lock: DennaLockFile = {
      sources: {
        sky: { version: '1.0.0', lockedAt: '2026-03-25T00:00:00Z' },
      },
    };

    await writeLockFile(configPath, lock);
    const read = await readLockFile(configPath);
    expect(read).toEqual(lock);
  });
});

describe('resolveSourceVersion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches manifest via github API with token', async () => {
    const manifest = JSON.stringify({
      metadata: { version: '2.5.0' },
    });
    const base64 = Buffer.from(manifest).toString('base64');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ content: base64, encoding: 'base64' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const source: GithubSource = {
      type: 'github',
      repo: 'org/repo',
      ref: 'main',
      tokenEnv: 'TEST_TOKEN',
    };
    const version = await resolveSourceVersion(source, 'ghp_test');
    expect(version).toBe('2.5.0');

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect((opts?.headers as Record<string, string>).Authorization).toBe('Bearer ghp_test');
  });

  it('returns null when manifest not found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    );

    const source: GithubSource = { type: 'github', repo: 'org/repo', ref: 'main' };
    const version = await resolveSourceVersion(source);
    expect(version).toBeNull();
  });
});
