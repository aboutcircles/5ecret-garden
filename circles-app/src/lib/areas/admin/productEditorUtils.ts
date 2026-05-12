import type { Address } from '@aboutcircles/sdk-types';
import { isAddress } from '$lib/shared/utils/tx';

export function normalizeSku(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeAddressInput(value: string): Address | null {
  const normalized = value.trim().toLowerCase();
  if (!isAddress(normalized)) {
    return null;
  }
  return normalized as Address;
}