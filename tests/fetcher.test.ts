import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { fetchData } from '../src/fetcher.js';
import { DennaLoadError } from '../src/errors.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('fetchData', () => {
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
});
