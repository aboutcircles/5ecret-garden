/**
 * Shared utility helpers for the Circles Market SDK
 */

export type Hex = `0x${string}`;

/**
 * Returns true if the given value is a syntactically valid absolute URL.
 * Accepts only strings and ensures protocol and hostname are present.
 */
export function isAbsoluteUri(u: unknown): u is string {
  if (typeof u !== 'string') return false;
  try {
    const url = new URL(u);
    return !!url.protocol && !!url.hostname;
  } catch {
    return false;
  }
}

/**
 * Strictly normalizes an EVM address.
 * - Accepts only strings matching /^0x[a-fA-F0-9]{40}$/
 * - Returns lowercase address
 */
export function normalizeEvmAddress(v: unknown): string {
  if (typeof v !== 'string') throw new Error(`Invalid address: ${String(v)}`);
  const s = v.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(s)) throw new Error(`Invalid address: ${v}`);
  return s;
}

/**
 * Type guard for a valid EVM address (lower/upper accepted, not normalized).
 */
export function isEvmAddress(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

/**
 * Strict 32-byte hex normalization.
 * - null/undefined => undefined
 * - require string; trim + lowercase
 * - empty => undefined
 * - must match ^0x[0-9a-f]{64}$
 */
export function normalizeHex32(v: unknown, name: string): Hex | undefined {
  if (v == null) return undefined;
  if (typeof v !== 'string') throw new Error(`${name} must be a hex string`);
  const s = v.trim().toLowerCase();
  if (s.length === 0) return undefined;
  if (!/^0x[0-9a-f]{64}$/.test(s)) throw new Error(`${name} must be a 32-byte hex string`);
  return s as Hex;
}

/**
 * Validate SKU format used across app + SDK.
 * Rule: /^[a-z0-9][a-z0-9-_]{0,62}$/
 */
export function isValidSku(sku: string): boolean {
  return /^[a-z0-9][a-z0-9-_]{0,62}$/.test(sku);
}

/**
 * Asserts SKU validity, throwing a concise Error on failure.
 */
export function assertSku(sku: string): void {
  if (!isValidSku(sku)) throw new Error('Invalid SKU');
}

// CID helpers moved to @circles-profile/core. Keep this file focused on URL/hex/address utils.
