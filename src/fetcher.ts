import { readFile } from 'fs/promises';
import { DennaLoadError } from './errors.js';
import type { ResolvedSource } from './resolver.js';

export async function fetchData(source: ResolvedSource): Promise<string> {
  if (source.type === 'file') {
    try {
      return await readFile(source.path, 'utf-8');
    } catch (err) {
      throw new DennaLoadError(`File not found: ${source.path}`, source.path, { cause: err });
    }
  }

  if (source.type === 'url') {
    let response: Response;
    try {
      response = await fetch(source.url);
    } catch (err) {
      throw new DennaLoadError(
        `Network error fetching ${source.url}: ${err instanceof Error ? err.message : String(err)}`,
        source.url,
        { cause: err },
      );
    }

    if (!response.ok) {
      throw new DennaLoadError(
        `HTTP ${response.status} fetching ${source.url}`,
        source.url,
      );
    }

    return response.text();
  }

  throw new DennaLoadError(`Cannot fetch glob source directly — resolve globs first`, 'glob');
}
