import { ethers } from 'ethers';
import { uint256ToAddress, CirclesConverter } from '@circles-sdk/utils';
import { formatCurrency } from '$lib/cart/money';

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

const tokenIdKeys = new Set(['Id', 'TokenId', 'TokenID']);
export function tokenIdToAddressMaybe(key: string, val: unknown): string | null {
  if (!tokenIdKeys.has(key)) return null;
  const bi = toBigIntMaybe(val);
  if (bi === null) return null;
  try {
    const addr = uint256ToAddress(bi);
    if (!isAddress(addr)) return null;
    return addr;
  } catch (error) {
    console.warn('tokenIdToAddressMaybe: failed', { key, val, error });
    return null;
  }
}

export function addressForDisplay(key: string, val: unknown): string {
  const addr = isAddress(val) ? (val as string) : tokenIdToAddressMaybe(key, val);
  return addr ?? '';
}

export function formatAttoCircles(val: unknown): string | null {
  const bi = toBigIntMaybe(val);
  if (bi === null) return null;
  try {
    const circles = CirclesConverter.attoCirclesToCircles(bi);
    if (!Number.isFinite(circles)) return null;
    return formatCurrency(circles, 'CRC');
  } catch (error) {
    console.warn('formatAttoCircles: failed', { val, error });
    return null;
  }
}
