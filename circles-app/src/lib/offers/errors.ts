// Typed error classes for profiles-offers-lite

export class InvalidAddressError extends Error {
  constructor(field: string, value: string) {
    super(`InvalidAddressError: ${field}=${value}`);
    this.name = 'InvalidAddressError';
  }
}

export class InvalidSkuError extends Error {
  constructor(sku: string) {
    super(`InvalidSkuError: sku=${sku}`);
    this.name = 'InvalidSkuError';
  }
}

export class InvalidUriError extends Error {
  constructor(field: string, value: string) {
    super(`InvalidUriError: ${field}=${value}`);
    this.name = 'InvalidUriError';
  }
}

export class CurrencyCodeError extends Error {
  constructor(value: string) {
    super(`CurrencyCodeError: ${value}`);
    this.name = 'CurrencyCodeError';
  }
}

export class PinFailedError extends Error {
  constructor(what: 'product'|'head'|'index'|'profile'|'link', detail?: string) {
    super(`PinFailedError: ${what}${detail ? `: ${detail}` : ''}`);
    this.name = 'PinFailedError';
  }
}

export class PublishRaceError extends Error {
  constructor(currentDigest: string, rebasedDigest?: string) {
    super(`PublishRaceError: current=${currentDigest}${rebasedDigest ? `, rebased=${rebasedDigest}` : ''}`);
    this.name = 'PublishRaceError';
  }
}

export class SafeOwnerSignatureUnavailableError extends Error {
  constructor() {
    super('SafeOwnerSignatureUnavailableError');
    this.name = 'SafeOwnerSignatureUnavailableError';
  }
}

export class ObjectTooLargeError extends Error {
  constructor(bytes: number, limit: number) {
    super(`ObjectTooLargeError: ${bytes} > ${limit}`);
    this.name = 'ObjectTooLargeError';
  }
}

export class CanonicalisationError extends Error {
  constructor(detail: string) {
    super(`CanonicalisationError: ${detail}`);
    this.name = 'CanonicalisationError';
  }
}
