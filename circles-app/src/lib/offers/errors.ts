// Domain-specific errors and re-exports for profiles-offers-lite

// Re-export SDK/core errors instead of duplicating
export { CurrencyCodeError, ObjectTooLargeError } from '@circles-market/sdk';

export class PinFailedError extends Error {
  constructor(what: 'product'|'head'|'index'|'profile'|'link', detail?: string) {
    super(`PinFailedError: ${what}${detail ? `: ${detail}` : ''}`);
    this.name = 'PinFailedError';
  }
}

// Re-export the canonicalisation error from the core library to avoid duplication
export { CanonicalisationError } from '@circles-profile/core';
