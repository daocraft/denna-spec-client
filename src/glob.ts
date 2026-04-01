import { readdir } from 'fs/promises';
import { join, resolve, dirname, basename } from 'path';
import { resolveSource, hasGlob } from './resolver.js';
import type { DennaConfig, GithubSource } from './config.js';
import { DennaLoadError } from './errors.js';
import { resolveGithubToken, githubListDir } from './github.js';

function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + escaped.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
}

async function expandFilesystemGlob(basePath: string, pattern: string): Promise<string[]> {
  const dir = pattern.includes('/')
    ? join(basePath, pattern.substring(0, pattern.lastIndexOf('/')))
    : basePath;
  const filePattern = pattern.includes('/')
    ? pattern.substring(pattern.lastIndexOf('/') + 1)
    : pattern;

  let files: string[];
  try {
    const entries = await readdir(dir);
    files = entries.filter((f) => f.endsWith('.denna-spec.json'));
  } catch (err) {
    throw new DennaLoadError(`Directory not found: ${dir}`, dir, { cause: err });
  }

  if (filePattern !== '*') {
    const regex = globToRegex(filePattern);
    files = files.filter((f) => regex.test(f));
  }

  return files.map((f) => resolve(dir, f));
}

async function expandGithubGlob(source: GithubSource, pattern: string, alias: string): Promise<string[]> {
  const token = resolveGithubToken(source.tokenEnv);
  const dir = pattern.includes('/')
    ? pattern.substring(0, pattern.lastIndexOf('/'))
    : '';
  const filePattern = pattern.includes('/')
    ? pattern.substring(pattern.lastIndexOf('/') + 1)
    : pattern;

  const entries = await githubListDir(source.repo, source.ref, dir, token);
  let files = entries
    .filter((e) => e.type === 'file' && e.name.endsWith('.denna-spec.json'))
    .map((e) => e.name);

  if (filePattern !== '*') {
    const regex = globToRegex(filePattern);
    files = files.filter((f) => regex.test(f));
  }

  // Return as alias:path strings (sans .denna-spec.json) so resolveSource can re-resolve them
  return files.map((f) => {
    const name = f.replace(/\.denna-spec\.json$/, '');
    return `${alias}:${dir ? dir + '/' : ''}${name}`;
  });
}

export async function expandGlob(input: string, config: DennaConfig | null): Promise<string[]> {
  // Handle direct file glob patterns (not aliases)
  if (!input.includes(':') || input.startsWith('/') || input.startsWith('./') || input.startsWith('https://') || input.startsWith('http://')) {
    if (hasGlob(input)) {
      const dir = dirname(input);
      const pattern = basename(input);
      let entries: string[];
      try {
        entries = await readdir(dir);
      } catch (err) {
        throw new DennaLoadError(`Directory not found: ${dir}`, dir, { cause: err });
      }
      const regex = globToRegex(pattern);
      return entries.filter((f) => regex.test(f)).map((f) => resolve(dir, f));
    }
    const resolved = resolveSource(input, config);
    if (resolved.type === 'file') return [resolved.path];
    if (resolved.type === 'url') return [resolved.url];
    return [];
  }

  const colonIdx = input.indexOf(':');
  const alias = input.substring(0, colonIdx);

  const resolved = resolveSource(input, config);

  if (resolved.type !== 'glob') {
    if (resolved.type === 'file') return [resolved.path];
    if (resolved.type === 'url') return [resolved.url];
    if (resolved.type === 'github') return [input];
    return [];
  }

  if (resolved.source.type === 'filesystem') {
    return expandFilesystemGlob(resolved.source.path, resolved.pattern);
  }

  if (resolved.source.type === 'github') {
    return expandGithubGlob(resolved.source as GithubSource, resolved.pattern, alias);
  }

  throw new DennaLoadError(`Unknown source type for glob expansion`, input);
}
