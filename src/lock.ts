import { readFile, writeFile } from 'fs/promises';
import { resolve, dirname, join } from 'path';
import { DennaLoadError, DennaParseError } from './errors.js';
import type { DennaConfig, GithubSource } from './config.js';

export interface LockedSource {
  version: string;
  lockedAt: string;
}

export interface DennaLockFile {
  sources: Record<string, LockedSource>;
}

interface ManifestMetadata {
  version?: string;
  [key: string]: unknown;
}

interface Manifest {
  metadata?: ManifestMetadata;
  [key: string]: unknown;
}

const LOCK_FILENAME = 'denna.lock.json';
const MANIFEST_FILENAME = 'denna-repo.denna-spec.json';

export function lockFilePath(configPath: string): string {
  return join(dirname(configPath), LOCK_FILENAME);
}

export async function readLockFile(configPath: string): Promise<DennaLockFile | null> {
  const path = lockFilePath(configPath);
  let raw: string;
  try {
    raw = await readFile(path, 'utf-8');
  } catch {
    return null;
  }

  try {
    return JSON.parse(raw) as DennaLockFile;
  } catch (err) {
    throw new DennaParseError(`Invalid JSON in lock file: ${path}`, path, { cause: err });
  }
}

export async function writeLockFile(configPath: string, lock: DennaLockFile): Promise<void> {
  const path = lockFilePath(configPath);
  await writeFile(path, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
}

/**
 * Fetch the repository manifest from a github source to read its version.
 */
async function fetchManifest(source: GithubSource): Promise<Manifest | null> {
  const url = `https://raw.githubusercontent.com/${source.repo}/${source.ref}/${MANIFEST_FILENAME}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json() as Manifest;
  } catch {
    return null;
  }
}

/**
 * Resolve the current version for a github source by reading its manifest.
 * Returns the manifest version string, or null if no manifest/version found.
 */
export async function resolveSourceVersion(source: GithubSource): Promise<string | null> {
  const manifest = await fetchManifest(source);
  return manifest?.metadata?.version ?? null;
}

/**
 * Build a lock file by resolving versions for all github sources in the config.
 */
export async function buildLockFile(config: DennaConfig): Promise<DennaLockFile> {
  const sources: Record<string, LockedSource> = {};
  const now = new Date().toISOString();

  if (!config.sources) return { sources };

  for (const [alias, source] of Object.entries(config.sources)) {
    if (source.type !== 'github') continue;

    const version = await resolveSourceVersion(source);
    if (version) {
      sources[alias] = { version, lockedAt: now };
    }
  }

  return { sources };
}

/**
 * Get the effective ref for a github source, considering the lock file.
 * If locked, returns `v{version}` as the tag ref. Otherwise returns the config ref.
 */
export function getLockedRef(source: GithubSource, alias: string, lock: DennaLockFile | null): string {
  const locked = lock?.sources?.[alias];
  if (locked?.version) {
    return `v${locked.version}`;
  }
  return source.ref;
}
