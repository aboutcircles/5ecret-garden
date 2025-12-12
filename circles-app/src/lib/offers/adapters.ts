import type { Address } from '../safeSigner/types';
import { normalizeEvmAddress } from '@circles-market/sdk';

export type { Address };

// Tiny shim: re-export SDK strict normalizer under the old local name. TODO: inline imports and delete this file later.
export function normalizeAddress(s: string): Address {
  return normalizeEvmAddress(s) as Address;
}

