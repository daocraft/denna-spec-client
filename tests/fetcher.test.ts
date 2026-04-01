import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolve } from 'path';
import { fetchData } from '../src/fetcher.js';
import { DennaLoadError } from '../src/errors.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('fetchData', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads a file from the filesystem', async () => {
    const data = await fetchData({
      type: 'file',
      path: resolve(FIXTURES, 'data/valid-rates.denna-spec.json'),
    });
    expect(data).toContain('"$schema"');
    expect(data).toContain('"ssrSpread"');
  });

  it('throws DennaLoadError for missing file', async () => {
    await expect(
      fetchData({ type: 'file', path: '/nonexistent/file.json' })
    ).rejects.toBeInstanceOf(DennaLoadError);
  });

  it('throws DennaLoadError for failed URL', async () => {
    await expect(
      fetchData({ type: 'url', url: 'http://localhost:1/nonexistent' })
    ).rejects.toBeInstanceOf(DennaLoadError);
  });

  it('fetches github source via githubFetchFile', async () => {
    const content = JSON.stringify({ $schema: 'test', metadata: {} });
    const base64 = Buffer.from(content).toString('base64');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ content: base64, encoding: 'base64' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await fetchData({
      type: 'github',
      repo: 'owner/repo',
      ref: 'main',
      path: 'star/config.denna-spec.json',
      token: 'ghp_abc',
    });

    expect(result).toBe(content);
  });

  it('fetches github source without token', async () => {
    const content = '{}';
    const base64 = Buffer.from(content).toString('base64');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ content: base64, encoding: 'base64' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await fetchData({
      type: 'github',
      repo: 'owner/repo',
      ref: 'main',
      path: 'file.json',
    });

    expect(result).toBe(content);

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect((opts?.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
