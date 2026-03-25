interface SchemaNode {
  type?: string | string[];
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  default?: unknown;
  $ref?: string;
  $defs?: Record<string, SchemaNode>;
  [key: string]: unknown;
}

function getZeroValue(schema: SchemaNode): unknown {
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  switch (type) {
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object': {
      const obj: Record<string, unknown> = {};
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = propSchema.default ?? getZeroValue(propSchema);
        }
      }
      return obj;
    }
    default:
      return undefined;
  }
}

export function hydrateDefaults(data: Record<string, unknown>, schema: SchemaNode): void {
  if (!schema.properties) return;

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    if (key in data) {
      if (
        propSchema.type === 'object' &&
        propSchema.properties &&
        data[key] !== null &&
        typeof data[key] === 'object' &&
        !Array.isArray(data[key])
      ) {
        hydrateDefaults(data[key] as Record<string, unknown>, propSchema);
      }
      continue;
    }

    const value = propSchema.default ?? getZeroValue(propSchema);
    if (value !== undefined) {
      data[key] = value;
    }
  }
}
