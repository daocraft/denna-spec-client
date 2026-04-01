import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveGithubToken, githubFetchFile, githubListDir } from '../src/github.js';
import { DennaLoadError } from '../src/errors.js';

describe('resolveGithubToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns undefined when no tokenEnv is set', () => {
    expect(resolveGithubToken(undefined)).toBeUndefined();
  });

  it('returns the token value when env var exists', () => {
    process.env.MY_TOKEN = 'ghp_abc123';
    expect(resolveGithubToken('MY_TOKEN')).toBe('ghp_abc123');
  });

  it('throws DennaLoadError when tokenEnv is set but env var is missing', () => {
    expect(() => resolveGithubToken('MISSING_TOKEN')).toThrow(DennaLoadError);
    expect(() => resolveGithubToken('MISSING_TOKEN')).toThrow(
      'Environment variable "MISSING_TOKEN" is not set'
    );
  });

  it('throws DennaLoadError when tokenEnv is set but env var is empty', () => {
    process.env.EMPTY_TOKEN = '';
    expect(() => resolveGithubToken('EMPTY_TOKEN')).toThrow(DennaLoadError);
  });
});

describe('githubFetchFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and decodes base64 file content', async () => {
    const content = JSON.stringify({ hello: 'world' });
    const base64 = Buffer.from(content).toString('base64');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ content: base64, encoding: 'base64' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await githubFetchFile('owner/repo', 'main', 'path/file.json');
    expect(result).toBe(content);

    const [url, opts] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/owner/repo/contents/path/file.json?ref=main');
    expect((opts?.headers as Record<string, string>).Accept).toBe('application/vnd.github.v3+json');
  });

  it('sends Authorization header when token is provided', async () => {
    const base64 = Buffer.from('{}').toString('base64');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ content: base64, encoding: 'base64' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await githubFetchFile('owner/repo', 'main', 'file.json', 'ghp_token');

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect((opts?.headers as Record<string, string>).Authorization).toBe('Bearer ghp_token');
  });

  it('does not send Authorization header when no token', async () => {
    const base64 = Buffer.from('{}').toString('base64');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ content: base64, encoding: 'base64' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await githubFetchFile('owner/repo', 'main', 'file.json');

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect((opts?.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('throws DennaLoadError on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    );

    await expect(
      githubFetchFile('owner/repo', 'main', 'missing.json'),
    ).rejects.toBeInstanceOf(DennaLoadError);
  });

  it('throws DennaLoadError on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(
      githubFetchFile('owner/repo', 'main', 'file.json'),
    ).rejects.toBeInstanceOf(DennaLoadError);
  });
});

describe('githubListDir', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns file entries from directory listing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { name: 'config.denna-spec.json', type: 'file' },
          { name: 'subdir', type: 'dir' },
          { name: 'rates.denna-spec.json', type: 'file' },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await githubListDir('owner/repo', 'main', 'star');
    expect(result).toEqual([
      { name: 'config.denna-spec.json', type: 'file' },
      { name: 'subdir', type: 'dir' },
      { name: 'rates.denna-spec.json', type: 'file' },
    ]);
  });

  it('sends Authorization header when token is provided', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await githubListDir('owner/repo', 'main', '', 'ghp_token');

    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect((opts?.headers as Record<string, string>).Authorization).toBe('Bearer ghp_token');
  });

  it('throws DennaLoadError on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Forbidden', { status: 403 }),
    );

    await expect(
      githubListDir('owner/repo', 'main', 'dir'),
    ).rejects.toBeInstanceOf(DennaLoadError);
  });
});
