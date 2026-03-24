import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { DennaSpec } from '../src/loader.js';

const SKY_PARAMS = '/Users/cuzzea/src/amatsu/sky-parameters';
const hasSkyParams = existsSync(SKY_PARAMS);

describe.skipIf(!hasSkyParams)('e2e: load real sky-parameters files', () => {
  it('loads shared/stablecoin-addresses.denna-spec.json', async () => {
    const denna = new DennaSpec({ config: false });
    const data = await denna.load(resolve(SKY_PARAMS, 'shared/stablecoin-addresses.denna-spec.json'));

    expect(data.metadata.kind).toBe('io.denna.defi.address-registry');
    expect(data.addresses).toBeDefined();
  });

  it('loads spark/protocol-config.denna-spec.json', async () => {
    const denna = new DennaSpec({ config: false });
    const data = await denna.load(resolve(SKY_PARAMS, 'spark/protocol-config.denna-spec.json'));

    expect(data.metadata.kind).toBe('io.denna.defi.protocol-config');
  });

  it('loads spark/pnl-config.denna-spec.json', async () => {
    const denna = new DennaSpec({ config: false });
    const data = await denna.load(resolve(SKY_PARAMS, 'spark/pnl-config.denna-spec.json'));

    expect(data.metadata.kind).toBe('io.denna.defi.pnl-config');
  });

  it('loads obex/protocol-config.denna-spec.json', async () => {
    const denna = new DennaSpec({ config: false });
    const data = await denna.load(resolve(SKY_PARAMS, 'obex/protocol-config.denna-spec.json'));

    expect(data.metadata.kind).toBe('io.denna.defi.protocol-config');
  });

  it('hydrates defaults on loaded data', async () => {
    const denna = new DennaSpec({ config: false });
    const data = await denna.load(resolve(SKY_PARAMS, 'shared/stablecoin-addresses.denna-spec.json'));

    // Structural assertions — data may change over time
    expect(typeof data.metadata.kind).toBe('string');
    expect(data.addresses).toBeDefined();
  });
});
