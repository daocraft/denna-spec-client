import { describe, it, expect } from 'vitest';
import {
  DennaError,
  DennaLoadError,
  DennaParseError,
  DennaValidationError,
  DennaSchemaError,
} from '../src/errors.js';

describe('DennaError', () => {
  it('is an instance of Error', () => {
    const err = new DennaError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('DennaError');
    expect(err.message).toBe('test');
  });
});

describe('DennaLoadError', () => {
  it('extends DennaError with source', () => {
    const err = new DennaLoadError('not found', 'sky:spark/config');
    expect(err).toBeInstanceOf(DennaError);
    expect(err.name).toBe('DennaLoadError');
    expect(err.source).toBe('sky:spark/config');
  });
});

describe('DennaParseError', () => {
  it('extends DennaError with source', () => {
    const err = new DennaParseError('bad json', './file.json');
    expect(err).toBeInstanceOf(DennaError);
    expect(err.name).toBe('DennaParseError');
    expect(err.source).toBe('./file.json');
  });
});

describe('DennaValidationError', () => {
  it('extends DennaError with errors array', () => {
    const details = [{ path: '$.rates.value', message: 'must be number' }];
    const err = new DennaValidationError('validation failed', details);
    expect(err).toBeInstanceOf(DennaError);
    expect(err.name).toBe('DennaValidationError');
    expect(err.errors).toEqual(details);
  });
});

describe('DennaSchemaError', () => {
  it('extends DennaError with schemaUrl', () => {
    const err = new DennaSchemaError('fetch failed', 'https://spec.denna.io/v1/rates.schema.json');
    expect(err).toBeInstanceOf(DennaError);
    expect(err.name).toBe('DennaSchemaError');
    expect(err.schemaUrl).toBe('https://spec.denna.io/v1/rates.schema.json');
  });
});
