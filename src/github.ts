import { DennaLoadError } from './errors.js';

export interface GithubDirEntry {
  name: string;
  type: string;
}

/**
 * Resolve a GitHub token from an environment variable name.
 * Returns undefined if tokenEnv is not set.
 * Throws DennaLoadError if tokenEnv is set but the env var is missing or empty.
 */
export function resolveGithubToken(tokenEnv: string | undefined): string | undefined {
  if (!tokenEnv) return undefined;

  const value = process.env[tokenEnv];
  if (!value) {
    throw new DennaLoadError(
      `Environment variable "${tokenEnv}" is not set or empty — required for GitHub authentication. ` +
      `Set it in your .env file or CI secrets.`,
      tokenEnv,
    );
  }
  return value;
}

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch a single file from a GitHub repo via the Contents API.
 * Returns the decoded file content as a string.
 */
export async function githubFetchFile(
  repo: string,
  ref: string,
  path: string,
  token?: string,
): Promise<string> {
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${ref}`;

  let response: Response;
  try {
    response = await fetch(url, { headers: buildHeaders(token) });
  } catch (err) {
    throw new DennaLoadError(
      `Network error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`,
      url,
      { cause: err },
    );
  }

  if (!response.ok) {
    throw new DennaLoadError(
      `GitHub API error: HTTP ${response.status} for ${url}${!token ? ' (no token — 60 req/hr limit)' : ''}`,
      url,
    );
  }

  const body = (await response.json()) as { content: string; encoding: string };
  return Buffer.from(body.content, 'base64').toString('utf-8');
}

/**
 * List directory contents from a GitHub repo via the Contents API.
 * Returns an array of { name, type } entries.
 */
export async function githubListDir(
  repo: string,
  ref: string,
  dir: string,
  token?: string,
): Promise<GithubDirEntry[]> {
  const url = `https://api.github.com/repos/${repo}/contents/${dir}?ref=${ref}`;

  let response: Response;
  try {
    response = await fetch(url, { headers: buildHeaders(token) });
  } catch (err) {
    throw new DennaLoadError(
      `Network error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`,
      url,
      { cause: err },
    );
  }

  if (!response.ok) {
    throw new DennaLoadError(
      `GitHub API error: HTTP ${response.status} for ${url}${!token ? ' (no token — 60 req/hr limit)' : ''}`,
      url,
    );
  }

  return (await response.json()) as GithubDirEntry[];
}
