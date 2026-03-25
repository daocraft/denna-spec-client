import { resolve, basename } from 'path';
import { DennaSpec } from '../loader.js';
import { loadConfig, discoverConfig } from '../config.js';
import { expandGlob } from '../glob.js';
import { DennaError, DennaValidationError } from '../errors.js';

interface ValidateOptions {
  config?: string;
  quiet?: boolean;
  verbose?: boolean;
}

export async function validateCommand(sources: string[], options: ValidateOptions): Promise<void> {
  const configPath = options.config
    ? resolve(options.config)
    : await discoverConfig(process.cwd());
  const config = configPath ? await loadConfig(configPath) : null;

  // Config is only needed for glob expansion; DennaSpec.load() receives fully
  // resolved paths so it doesn't need to load config again.
  const denna = new DennaSpec({ config: false });

  const expandedSources: string[] = [];
  for (const source of sources) {
    const expanded = await expandGlob(source, config);
    expandedSources.push(...expanded);
  }

  let hasFailures = false;

  for (const source of expandedSources) {
    const label = basename(source);
    try {
      await denna.load(source);
      if (!options.quiet) {
        console.log(`${label}  ✓`);
      }
    } catch (err) {
      hasFailures = true;
      if (err instanceof DennaValidationError) {
        const detail = err.errors[0]?.message ?? err.message;
        console.error(`${label}  ✗  — ${err.errors[0]?.path ?? '$'}: ${detail}`);
      } else if (err instanceof DennaError) {
        console.error(`${label}  ✗  — ${err.message}`);
      } else {
        console.error(`${label}  ✗  — ${err}`);
      }
    }
  }

  if (hasFailures) {
    process.exit(1);
  }
}
