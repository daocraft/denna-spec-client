import Ajv, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFile } from 'fs/promises';
import type { ValidationErrorDetail } from './errors.js';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrorDetail[];
}

async function loadSchemaByUri(uri: string): Promise<object> {
  // Handle URLs
  if (uri.startsWith('https://') || uri.startsWith('http://')) {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to load schema: ${uri} (HTTP ${response.status})`);
    }
    return response.json();
  }

  // Handle file paths (relative or absolute)
  try {
    const raw = await readFile(uri, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to load schema from file: ${uri}`, { cause: err });
  }
}

export function createValidator() {
  const ajv = new Ajv({
    strict: true,
    strictTypes: false, // Allow if/then patterns without redundant type declarations
    allErrors: true,
    useDefaults: true,
    loadSchema: loadSchemaByUri,
  });
  addFormats(ajv);

  return {
    addSchema(schema: object, id?: string): void {
      ajv.addSchema(schema, id);
    },

    async validate(data: unknown, schema: object): Promise<ValidationResult> {
      const schemaId = (schema as Record<string, unknown>).$id as string | undefined;
      let validate: ValidateFunction;

      // Reuse previously compiled validator for schemas with an $id
      const existing = schemaId ? ajv.getSchema(schemaId) : undefined;
      if (existing) {
        validate = existing;
      } else {
        validate = await ajv.compileAsync(schema);
      }

      const valid = validate(data);

      if (valid) {
        return { valid: true, errors: [] };
      }

      const errors: ValidationErrorDetail[] = (validate.errors ?? []).map((e) => ({
        path: e.instancePath || '$',
        message: e.message ?? 'unknown error',
      }));

      return { valid: false, errors };
    },
  };
}
