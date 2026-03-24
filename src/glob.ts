import { readdir } from 'fs/promises';
import { join, resolve, dirname, basename } from 'path';
import { resolveSource, hasGlob } from './resolver.js';
import type { DennaConfig, GithubSource } from './config.js';
import { DennaLoadError } from './errors.js';

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

async function expandGithubGlob(source: GithubSource, pattern: string): Promise<string[]> {
  const token = process.env.GITHUB_TOKEN;
  const dir = pattern.includes('/')
    ? pattern.substring(0, pattern.lastIndexOf('/'))
    : '';
  const apiUrl = `https://api.github.com/repos/${source.repo}/contents/${dir}?ref=${source.ref}`;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    throw new DennaLoadError(
      `GitHub API error: HTTP ${response.status} for ${apiUrl}${!token ? ' (no GITHUB_TOKEN set — 60 req/hr limit)' : ''}`,
      apiUrl,
    );
  }

  const entries = (await response.json()) as Array<{ name: string; type: string }>;
  const files = entries
    .filter((e) => e.type === 'file' && e.name.endsWith('.denna-spec.json'))
    .map((e) => `https://raw.githubusercontent.com/${source.repo}/${source.ref}/${dir ? dir + '/' : ''}${e.name}`);

  return files;
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
    // Not a glob — pass through to resolver
    const resolved = resolveSource(input, config);
    if (resolved.type === 'file') return [resolved.path];
    if (resolved.type === 'url') return [resolved.url];
    return [];
  }

  const resolved = resolveSource(input, config);

  if (resolved.type !== 'glob') {
    if (resolved.type === 'file') return [resolved.path];
    if (resolved.type === 'url') return [resolved.url];
    return [];
  }

  if (resolved.source.type === 'filesystem') {
    return expandFilesystemGlob(resolved.source.path, resolved.pattern);
  }

  if (resolved.source.type === 'github') {
    return expandGithubGlob(resolved.source as GithubSource, resolved.pattern);
  }

  throw new DennaLoadError(`Unknown source type for glob expansion`, input);
}
