import { resolve, dirname } from 'path';
import { loadConfig, discoverConfig } from '../config.js';
import { generateTypesTree } from '../codegen.js';
import { buildLockFile, readLockFile, writeLockFile, lockFilePath } from '../lock.js';

interface SyncOptions {
  config?: string;
  lock?: boolean;
  updateLock?: boolean;
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

  // Handle --lock or --update-lock
  if (options.lock || options.updateLock) {
    const githubSources = Object.entries(config.sources ?? {}).filter(
      ([, s]) => s.type === 'github',
    );

    if (githubSources.length === 0) {
      if (!options.quiet) {
        console.log('No github sources to lock.');
      }
    } else {
      if (!options.quiet) {
        console.log(`Resolving versions for ${githubSources.length} source(s)...`);
      }

      const newLock = await buildLockFile(config);

      // For --update-lock, merge with existing lock (preserving entries not in config)
      if (options.updateLock) {
        const existingLock = await readLockFile(configPath);
        if (existingLock) {
          for (const [alias, locked] of Object.entries(existingLock.sources)) {
            if (!(alias in newLock.sources)) {
              newLock.sources[alias] = locked;
            }
          }
        }
      }

      await writeLockFile(configPath, newLock);

      if (!options.quiet) {
        for (const [alias, locked] of Object.entries(newLock.sources)) {
          console.log(`  ${alias}: v${locked.version} (locked at ${locked.lockedAt})`);
        }
        console.log(`\nLock file written to ${lockFilePath(configPath)}`);
      }
    }
  }

  // Generate types
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
