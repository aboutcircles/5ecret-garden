// Minimal Base58 BTC decoder and CIDv0 helpers
// No external deps; works in browser and Node.

export type Hex = `0x${string}`;
export type CidV0 = `Qm${string}`;

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_MAP: Record<string, number> = {};
for (let i = 0; i < BASE58_ALPHABET.length; i++) BASE58_MAP[BASE58_ALPHABET[i]] = i;

function base58btcDecode(s: string): Uint8Array {
  if (!s || typeof s !== 'string') throw new Error('base58: input');
  let zeros = 0;
  while (zeros < s.length && s[zeros] === '1') zeros++;
  const bytes: number[] = [];
  const base = 58n;
  let num = 0n;
  for (let i = zeros; i < s.length; i++) {
    const ch = s[i];
    const val = BASE58_MAP[ch];
    if (val == null) throw new Error('base58: invalid char');
    num = num * base + BigInt(val);
  }
  // Convert big integer to bytes
  while (num > 0n) {
    bytes.push(Number(num & 0xffn));
    num >>= 8n;
  }
  for (let i = 0; i < zeros; i++) bytes.push(0);
  bytes.reverse();
  return new Uint8Array(bytes);
}

export function cidV0ToDigest32(cid: CidV0): Hex {
  // CIDv0 is base58btc of multihash sha2-256(32)
  const bytes = base58btcDecode(cid);
  if (bytes.length !== 34) throw new Error('cidv0: length');
  const fn = bytes[0];
  const len = bytes[1];
  if (fn !== 0x12 || len !== 0x20) throw new Error('cidv0: multihash mismatch');
  const digest = bytes.slice(2);
  let hex = '0x';
  for (const b of digest) hex += b.toString(16).padStart(2, '0');
  return hex as Hex;
}
