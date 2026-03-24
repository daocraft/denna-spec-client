import { resolve, dirname } from 'path';
import { loadConfig, discoverConfig } from '../config.js';
import { generateTypes } from '../codegen.js';

interface SyncOptions {
  config?: string;
  quiet?: boolean;
  verbose?: boolean;
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  const configPath = options.config
    ? resolve(options.config)
    : await discoverConfig(process.cwd());

  if (!configPath) {
    console.error('No denna.config.json found. Use --config to specify one.');
    process.exit(1);
  }

  const config = await loadConfig(configPath);
  const configDir = dirname(configPath);

  const schemas = config.schemas.map((s) =>
    s.startsWith('https://') || s.startsWith('http://') ? s : resolve(configDir, s),
  );

  const outputPath = resolve(configDir, config.output);

  if (!options.quiet) {
    console.log(`Generating types from ${schemas.length} schema(s)...`);
  }

  await generateTypes({ schemas, output: outputPath });

  if (!options.quiet) {
    console.log(`Types written to ${outputPath}`);
  }
}
