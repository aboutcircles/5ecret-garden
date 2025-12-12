// Domain-specific errors and re-exports for profiles-offers-lite

// Re-export SDK errors instead of duplicating
export { CurrencyCodeError, ObjectTooLargeError, CanonicalisationError } from '@circles-market/sdk';

export class PinFailedError extends Error {
  constructor(what: 'product'|'head'|'index'|'profile'|'link', detail?: string) {
    super(`PinFailedError: ${what}${detail ? `: ${detail}` : ''}`);
    this.name = 'PinFailedError';
  }
}
