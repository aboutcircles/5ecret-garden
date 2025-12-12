// Central CID helpers for Circles
// Single source of truth used by app and market SDK

export type Hex = `0x${string}`;

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_MAP: Record<string, number> = {};
for (let i = 0; i < BASE58_ALPHABET.length; i++) {
  BASE58_MAP[BASE58_ALPHABET[i]] = i;
}

function base58btcDecode(s: string): Uint8Array {
  if (!s || typeof s !== 'string') {
    throw new Error('base58: input');
  }
  let zeros = 0;
  while (zeros < s.length && s[zeros] === '1') zeros++;
  const bytes: number[] = [];
  const base = 58n;
  let num = 0n;
  for (let i = zeros; i < s.length; i++) {
    const ch = s[i];
    const val = BASE58_MAP[ch];
    if (val == null) {
      throw new Error('base58: invalid char');
    }
    num = num * base + BigInt(val);
  }
  while (num > 0n) {
    bytes.push(Number(num & 0xffn));
    num >>= 8n;
  }
  for (let i = 0; i < zeros; i++) bytes.push(0);
  bytes.reverse();
  return new Uint8Array(bytes);
}

export function tryCidV0ToDigest32(cid: unknown): Hex | undefined {
  if (typeof cid !== 'string') {
    return undefined;
  }
  const s = cid.trim();
  if (!/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(s)) {
    return undefined;
  }
  try {
    const bytes = base58btcDecode(s);
    if (bytes.length !== 34) return undefined;
    if (bytes[0] !== 0x12 || bytes[1] !== 0x20) return undefined;
    const digest = bytes.slice(2);
    let hex = '0x';
    for (const b of digest) {
      hex += b.toString(16).padStart(2, '0');
    }
    return hex as Hex;
  } catch {
    return undefined;
  }
}

export function cidV0ToDigest32Strict(cid: string): Hex {
  const hex = tryCidV0ToDigest32(cid);
  if (!hex) {
    throw new Error(`Expected CIDv0 (sha2-256) string, got: ${cid}`);
  }
  return hex;
}
