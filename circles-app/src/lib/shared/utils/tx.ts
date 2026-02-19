import { ethers } from 'ethers';
import { formatCurrency } from '$lib/shared/utils/money';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const isZeroAddress = (addr?: string | null) => (addr ?? '').toLowerCase() === ZERO_ADDRESS;
export const isAddress = (v: unknown): v is string => typeof v === 'string' && ethers.isAddress(v);

export function toBigIntMaybe(v: unknown): bigint | null {
  try {
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) return null;
      return BigInt(Math.trunc(v));
    }
    if (typeof v === 'string') {
      const s = v.trim();
      if (/^0x[0-9a-fA-F]+$/.test(s)) return BigInt(s);
      if (/^[+-]?\d+$/.test(s)) return BigInt(s);
    }
    return null;
  } catch (error) {
    console.warn('toBigIntMaybe: failed to convert value to bigint', { value: v, error });
    return null;
  }
}

export function addressForDisplay(key: string, val: unknown): string {
  const addr = isAddress(val) ? (val as string) : null;
  return addr ?? '';
}
