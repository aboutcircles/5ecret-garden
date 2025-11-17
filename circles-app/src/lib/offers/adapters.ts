import { InvalidAddressError } from './errors';
import type { Address } from '../safeSigner/types';

export type { Address };

/**
 * Lowercase & validate an EVM address. Throws on invalid.
 */
export function normalizeAddress(s: string): Address {
  if (typeof s !== 'string') {
    throw new InvalidAddressError('address', String(s));
  }
  const v = s.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(v)) {
    throw new InvalidAddressError('address', s);
  }
  return v as Address;
}

/**
 * Simple absolute-URI check used across JSON-LD builders.
 */
export function isAbsoluteUri(s: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(s);
    return true;
  } catch {
    return false;
  }
}
