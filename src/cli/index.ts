import { createRequire } from 'module';
import { Command } from 'commander';
import { syncCommand } from './sync.js';
import { loadCommand } from './load.js';
import { validateCommand } from './validate.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

const program = new Command();

program
  .name('denna')
  .description('Denna Spec client — codegen, load, and validate .denna-spec.json files')
  .version(version);

program
  .command('sync')
  .description('Regenerate TypeScript types from configured schemas')
  .option('--config <path>', 'Path to denna.config.json')
  .option('--lock', 'Lock github sources to their current manifest version')
  .option('--update-lock', 'Update locked versions to latest manifest versions')
  .option('--quiet', 'Suppress non-error output')
  .option('--verbose', 'Show detailed output')
  .action(syncCommand);

program
  .command('load <source>')
  .description('Load, validate, and print a denna-spec data file')
  .option('--config <path>', 'Path to denna.config.json')
  .option('--compact', 'Print compact JSON')
  .option('--quiet', 'Suppress non-error output')
  .option('--verbose', 'Show detailed output')
  .action(loadCommand);

program
  .command('validate <sources...>')
  .description('Validate denna-spec data files')
  .option('--config <path>', 'Path to denna.config.json')
  .option('--quiet', 'Suppress non-error output')
  .option('--verbose', 'Show detailed output')
  .action(validateCommand);

program.parse();
