import { resolve, dirname } from 'path';
import { readFile } from 'fs/promises';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { DennaParseError, DennaValidationError, DennaLoadError } from './errors.js';
import { loadConfig, discoverConfig, type DennaConfig } from './config.js';
import { resolveSource } from './resolver.js';
import { fetchData } from './fetcher.js';
import { createValidator } from './validator.js';
import { hydrateDefaults } from './defaults.js';

export interface DennaSpecOptions {
  config?: string | false;
}

export class DennaSpec {
  private configPromise: Promise<DennaConfig | null> | null = null;
  private validator = createValidator();
  private options: DennaSpecOptions;

  constructor(options: DennaSpecOptions = {}) {
    this.options = options;
  }

  private async getConfig(): Promise<DennaConfig | null> {
    if (this.options.config === false) return null;
    if (!this.configPromise) {
      this.configPromise = (async () => {
        if (this.options.config) {
          return loadConfig(this.options.config);
        }
        const discovered = await discoverConfig(process.cwd());
        return discovered ? loadConfig(discovered) : null;
      })();
    }
    return this.configPromise;
  }

  /**
   * Collect all unique external $ref base URIs from a schema object.
   * External means the $ref has a file/path component (not just a fragment like "#/$defs/foo").
   */
  private collectExternalRefs(schema: Record<string, unknown>): string[] {
    const refs = new Set<string>();

    const walk = (node: unknown): void => {
      if (node === null || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        for (const item of node) walk(item);
        return;
      }
      const obj = node as Record<string, unknown>;
      if (typeof obj.$ref === 'string') {
        const ref = obj.$ref;
        // Extract the base URI (before any fragment)
        const hashIdx = ref.indexOf('#');
        const base = hashIdx >= 0 ? ref.substring(0, hashIdx) : ref;
        if (base) {
          refs.add(base);
        }
      }
      for (const value of Object.values(obj)) {
        walk(value);
      }
    };

    walk(schema);
    return [...refs];
  }

  /**
   * Pre-load schemas referenced via $ref so that Ajv can resolve them without
   * hitting the network. When a schema has an $id (e.g., https://spec.denna.io/v1/defi/rates.schema.json)
   * and uses $ref: "./denna-types.schema.json", Ajv resolves that relative to $id,
   * producing https://spec.denna.io/v1/defi/denna-types.schema.json.
   * We load the actual file from disk and register it under that resolved URL.
   */
  private async preloadReferencedSchemas(
    schema: Record<string, unknown>,
    schemaDir: string,
  ): Promise<void> {
    const externalRefs = this.collectExternalRefs(schema);
    if (externalRefs.length === 0) return;

    const schemaId = schema.$id as string | undefined;

    for (const ref of externalRefs) {
      const localPath = resolve(schemaDir, ref);
      let refSchema: Record<string, unknown>;
      try {
        const raw = await readFile(localPath, 'utf-8');
        refSchema = JSON.parse(raw);
      } catch {
        // If we can't load locally, skip — Ajv's loadSchema will try at runtime
        continue;
      }

      // Determine the URI Ajv will look for when resolving this $ref
      let resolvedUri: string;
      if (schemaId && (schemaId.startsWith('https://') || schemaId.startsWith('http://'))) {
        const baseUrl = new URL(schemaId);
        resolvedUri = new URL(ref, baseUrl).href;
      } else {
        resolvedUri = localPath;
      }

      // Only add if not already registered (avoids "schema already exists" error on repeated loads)
      try {
        this.validator.addSchema(refSchema, resolvedUri);
      } catch {
      }
    }
  }

  private async fetchSchemaRaw(schemaRef: string, basePath?: string): Promise<{ schema: Record<string, unknown>; schemaDir: string }> {
    let resolvedRef = schemaRef;
    if (!schemaRef.startsWith('https://') && !schemaRef.startsWith('http://')) {
      resolvedRef = basePath
        ? resolve(dirname(basePath), schemaRef)
        : resolve(schemaRef);
    }

    const isUrl = resolvedRef.startsWith('https://') || resolvedRef.startsWith('http://');

    if (isUrl) {
      const response = await fetch(resolvedRef);
      if (!response.ok) {
        throw new DennaLoadError(`Failed to fetch schema: ${resolvedRef} (HTTP ${response.status})`, resolvedRef);
      }
      const schema = await response.json() as Record<string, unknown>;
      return { schema, schemaDir: basePath ? dirname(basePath) : process.cwd() };
    }

    try {
      const raw = await readFile(resolvedRef, 'utf-8');
      const schema = JSON.parse(raw) as Record<string, unknown>;
      return { schema, schemaDir: dirname(resolvedRef) };
    } catch (err) {
      throw new DennaLoadError(`Failed to load schema: ${resolvedRef}`, resolvedRef, { cause: err });
    }
  }

  async load<T = unknown>(source: string): Promise<T> {
    const config = await this.getConfig();
    const resolved = resolveSource(source, config);

    const raw = await fetchData(resolved);

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      throw new DennaParseError(`Invalid JSON in ${source}`, source, { cause: err });
    }

    const schemaRef = data.$schema;
    if (typeof schemaRef !== 'string' || !schemaRef) {
      throw new DennaValidationError('Missing $schema field', [
        { path: '$', message: 'Data file must have a $schema field' },
      ]);
    }

    const basePath = resolved.type === 'file' ? resolved.path : undefined;
    const { schema, schemaDir } = await this.fetchSchemaRaw(schemaRef, basePath);

    await this.preloadReferencedSchemas(schema, schemaDir);

    const result = await this.validator.validate(data, schema);
    if (!result.valid) {
      throw new DennaValidationError(
        `Validation failed for ${source}`,
        result.errors,
      );
    }

    const resolvedSchemaPath = (!schemaRef.startsWith('https://') && !schemaRef.startsWith('http://'))
      ? (basePath ? resolve(dirname(basePath), schemaRef) : resolve(schemaRef))
      : schemaRef;
    const dereferencedSchema = await $RefParser.dereference(resolvedSchemaPath) as Record<string, unknown>;

    hydrateDefaults(data, dereferencedSchema);

    return data as T;
  }
}
