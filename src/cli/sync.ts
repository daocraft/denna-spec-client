import { resolve, dirname } from 'path';
import { loadConfig, discoverConfig } from '../config.js';
import { generateTypesTree } from '../codegen.js';

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

  const outputDir = resolve(configDir, config.output);

  if (!options.quiet) {
    console.log(`Generating types from ${schemas.length} schema(s)...`);
  }

  const files = await generateTypesTree({ schemas, outputDir });

  if (!options.quiet) {
    const typeFiles = files.filter((f) => !f.relativePath.endsWith('index.ts'));
    for (const file of typeFiles) {
      console.log(`  ${file.relativePath}`);
    }
    console.log(`\n${typeFiles.length} type file(s) written to ${outputDir}`);
  }
}
