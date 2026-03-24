import { resolve } from 'path';
import { DennaSpec } from '../loader.js';
import { DennaError } from '../errors.js';

interface LoadOptions {
  config?: string;
  compact?: boolean;
  quiet?: boolean;
  verbose?: boolean;
}

export async function loadCommand(source: string, options: LoadOptions): Promise<void> {
  try {
    const denna = new DennaSpec({
      config: options.config ? resolve(options.config) : undefined,
    });

    const data = await denna.load(source);
    const indent = options.compact ? 0 : 2;
    console.log(JSON.stringify(data, null, indent));
  } catch (err) {
    if (err instanceof DennaError) {
      console.error(`Error: ${err.message}`);
    } else {
      console.error(`Unexpected error: ${err}`);
    }
    process.exit(1);
  }
}
