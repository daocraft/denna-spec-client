# @denna-spec/client

TypeScript library + CLI for loading, validating, and generating types from [Denna Spec](https://spec.denna.io) data files.

Denna Spec is a convention for structuring protocol parameters as JSON files validated by JSON Schema 2020-12. This client handles the full lifecycle: schema-driven codegen at build time, and validated + typed data loading at runtime.

## Install

```bash
npm install @denna-spec/client
```

## Quick start

### Load a data file

```ts
import { DennaSpec } from '@denna-spec/client';

const denna = new DennaSpec();
const data = await denna.load('shared/stablecoin-addresses.denna-spec.json');

console.log(data.metadata.kind); // "io.denna.defi.address-registry"
console.log(data.addresses);
```

`load()` does the following in order:

1. Resolves the source (file path, URL, or alias from config)
2. Fetches and parses the JSON
3. Reads the `$schema` field and fetches the schema
4. Pre-loads any `$ref`-referenced schemas from disk to avoid network requests
5. Validates with Ajv (JSON Schema 2020-12, strict mode)
6. Dereferences `$ref` chains and hydrates missing optional fields with zero values
7. Returns the typed result

### Generate TypeScript types from schemas

```ts
import { generateTypes } from '@denna-spec/client';

const output = await generateTypes({
  schemas: ['https://spec.denna.io/v1/defi/rates.schema.json'],
  output: './generated/denna-types.ts',
});
```

This produces TypeScript interfaces from JSON Schema files, plus a `SchemaTypeMap` interface that maps schema `$id` URLs to their root types.

## CLI

The package ships a `denna` CLI with three commands.

### `denna sync`

Regenerate TypeScript types from the schemas listed in `denna.config.json`.

```bash
denna sync
denna sync --config path/to/denna.config.json
```

### `denna load <source>`

Load, validate, and print a data file as JSON.

```bash
denna load shared/stablecoin-addresses.denna-spec.json
denna load sky:spark/protocol-config --compact
```

### `denna validate <sources...>`

Validate one or more data files. Supports glob patterns. Exits non-zero on failure.

```bash
denna validate shared/*.denna-spec.json
denna validate sky:spark/* sky:obex/*
```

## Configuration

Create a `denna.config.json` in your project root (the CLI auto-discovers it by walking up from `cwd`):

```json
{
  "schemas": [
    "https://spec.denna.io/v1/defi/rates.schema.json",
    "./local/schemas/custom.schema.json"
  ],
  "output": "./generated/denna-types.ts",
  "sources": {
    "sky": {
      "type": "filesystem",
      "path": "../sky-parameters"
    },
    "remote": {
      "type": "github",
      "repo": "org/repo",
      "ref": "main"
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `schemas` | Schema URLs or file paths for codegen (`denna sync`) |
| `output` | Output path for generated TypeScript types |
| `sources` | Named aliases for data sources (filesystem paths or GitHub repos) |

### Source aliases

Aliases let you reference data files without full paths:

- `sky:spark/protocol-config` resolves to `<source.path>/spark/protocol-config.denna-spec.json` for filesystem sources, or the equivalent raw GitHub URL for GitHub sources.
- Glob patterns work with aliases: `sky:spark/*`

## API

### `DennaSpec`

```ts
import { DennaSpec } from '@denna-spec/client';

// Auto-discover denna.config.json
const denna = new DennaSpec();

// Explicit config path
const denna = new DennaSpec({ config: './denna.config.json' });

// No config (resolve paths directly)
const denna = new DennaSpec({ config: false });

const data = await denna.load<MyType>('source');
```

### `generateTypes(options)`

```ts
import { generateTypes } from '@denna-spec/client';

const ts = await generateTypes({
  schemas: ['./schema.json'],
  output: './types.ts', // optional — also writes to file
});
```

### `loadConfig(path)` / `discoverConfig(startDir)`

```ts
import { loadConfig, discoverConfig } from '@denna-spec/client';

const configPath = await discoverConfig(process.cwd());
const config = configPath ? await loadConfig(configPath) : null;
```

### Errors

All errors extend `DennaError`:

| Class | When |
|-------|------|
| `DennaLoadError` | File not found, network error, HTTP error |
| `DennaParseError` | Invalid JSON or invalid config structure |
| `DennaValidationError` | Schema validation failure (includes `.errors` array with paths and messages) |
| `DennaSchemaError` | Schema fetch/compile failure |

All errors preserve the original `cause` for debugging.

## How data files work

A `.denna-spec.json` file looks like:

```json
{
  "$schema": "https://spec.denna.io/v1/defi/rates.schema.json",
  "metadata": { "kind": "io.denna.defi.rates" },
  "rates": {
    "ssrSpread": { "value": 30, "unit": "bps" }
  }
}
```

The `$schema` field points to the JSON Schema that validates the file. Schemas use JSON Schema 2020-12 and may reference shared type definitions via `$ref`.

## License

MIT
