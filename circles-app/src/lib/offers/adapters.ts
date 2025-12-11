import type { Address } from '../safeSigner/types';

export type { Address };

/**
 * Lowercase & validate an EVM address. Throws on invalid.
 * Note: This implementation is stricter than the SDK's SignersClientImpl.normalizeAddress,
 * which only checks prefix/length. Here we also validate hex chars via /^0x[a-f0-9]{40}$/. 
 * Keep in mind when comparing behaviours across layers.
 */
export function normalizeAddress(s: string): Address {
  if (typeof s !== 'string') {
    throw new Error(`Invalid EVM address: ${String(s)}`);
  }
  const v = s.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(v)) {
    throw new Error(`Invalid EVM address: ${s}`);
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
