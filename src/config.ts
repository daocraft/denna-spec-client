import { readFile, access } from 'fs/promises';
import { resolve, dirname, join } from 'path';
import { DennaLoadError, DennaParseError } from './errors.js';

export interface GithubSource {
  type: 'github';
  repo: string;
  ref: string;
}

export interface FilesystemSource {
  type: 'filesystem';
  path: string;
}

export type DennaSource = GithubSource | FilesystemSource;

export interface DennaConfig {
  schemas: string[];
  output: string;
  sources?: Record<string, DennaSource>;
}

const CONFIG_FILENAME = 'denna.config.json';

export async function loadConfig(configPath: string): Promise<DennaConfig> {
  let raw: string;
  try {
    raw = await readFile(configPath, 'utf-8');
  } catch (err) {
    throw new DennaLoadError(`Config file not found: ${configPath}`, configPath, { cause: err });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new DennaParseError(`Invalid JSON in config: ${configPath}`, configPath, { cause: err });
  }

  if (
    typeof parsed !== 'object' || parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>).schemas) ||
    typeof (parsed as Record<string, unknown>).output !== 'string'
  ) {
    throw new DennaParseError(
      `Invalid config structure in ${configPath}: must have "schemas" (array) and "output" (string)`,
      configPath,
    );
  }

  return parsed as DennaConfig;
}

export async function discoverConfig(startDir: string): Promise<string | null> {
  let dir = resolve(startDir);
  const root = resolve('/');

  while (true) {
    const candidate = join(dir, CONFIG_FILENAME);
    try {
      await access(candidate);
      return candidate;
    } catch {
      // not found, walk up
    }

    const parent = dirname(dir);
    if (parent === dir || dir === root) {
      return null;
    }
    dir = parent;
  }
}
