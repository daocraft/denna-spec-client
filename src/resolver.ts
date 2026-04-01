import { join } from 'path';
import { DennaLoadError } from './errors.js';
import type { DennaConfig, DennaSource, GithubSource, FilesystemSource } from './config.js';
import { getLockedRef, type DennaLockFile } from './lock.js';
import { resolveGithubToken } from './github.js';

export type ResolvedSource =
  | { type: 'url'; url: string }
  | { type: 'file'; path: string }
  | { type: 'github'; repo: string; ref: string; path: string; token?: string }
  | { type: 'glob'; source: DennaSource; pattern: string };

export function hasGlob(input: string): boolean {
  return input.includes('*') || input.includes('?');
}

function isAlias(input: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_-]*:/.test(input) && !input.startsWith('https:') && !input.startsWith('http:');
}

export function resolveSource(input: string, config: DennaConfig | null, lock?: DennaLockFile | null): ResolvedSource {
  if (input.startsWith('https://') || input.startsWith('http://')) {
    return { type: 'url', url: input };
  }

  if (isAlias(input)) {
    const colonIdx = input.indexOf(':');
    const alias = input.substring(0, colonIdx);
    const path = input.substring(colonIdx + 1);

    if (!config?.sources?.[alias]) {
      throw new DennaLoadError(`Unknown source alias: "${alias}"`, input);
    }

    const source = config.sources[alias];

    if (hasGlob(path)) {
      return { type: 'glob', source, pattern: path };
    }

    if (source.type === 'github') {
      const ref = getLockedRef(source, alias, lock ?? null);
      const fullPath = `${path}.denna-spec.json`;
      const token = resolveGithubToken(source.tokenEnv);
      return { type: 'github', repo: source.repo, ref, path: fullPath, token };
    }

    if (source.type === 'filesystem') {
      const fullPath = join(source.path, `${path}.denna-spec.json`);
      return { type: 'file', path: fullPath };
    }

    throw new DennaLoadError(`Unknown source type: "${(source as DennaSource).type}"`, input);
  }

  return { type: 'file', path: input };
}
