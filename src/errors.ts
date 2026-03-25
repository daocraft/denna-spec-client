export class DennaError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DennaError';
  }
}

export class DennaLoadError extends DennaError {
  readonly source: string;

  constructor(message: string, source: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DennaLoadError';
    this.source = source;
  }
}

export class DennaParseError extends DennaError {
  readonly source: string;

  constructor(message: string, source: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DennaParseError';
    this.source = source;
  }
}

export interface ValidationErrorDetail {
  path: string;
  message: string;
}

export class DennaValidationError extends DennaError {
  readonly errors: ValidationErrorDetail[];

  constructor(message: string, errors: ValidationErrorDetail[], options?: ErrorOptions) {
    super(message, options);
    this.name = 'DennaValidationError';
    this.errors = errors;
  }
}

export class DennaSchemaError extends DennaError {
  readonly schemaUrl: string;

  constructor(message: string, schemaUrl: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DennaSchemaError';
    this.schemaUrl = schemaUrl;
  }
}
