import type { Address, Hex } from './types';

export function assertHex(hex: string, opts?: { length?: number }): asserts hex is Hex {
  if (typeof hex !== 'string' || !hex.startsWith('0x')) {
    throw new TypeError('invalid hex: must be a 0x-prefixed string');
  }
  const body = hex.slice(2);
  if (body.length % 2 !== 0) throw new TypeError('invalid hex: odd length');
  if (!/^([0-9a-fA-F]{2})*$/.test(body)) throw new TypeError('invalid hex: non-hex chars');
  if (opts?.length != null) {
    const bytes = body.length / 2;
    if (bytes !== opts.length) {
      throw new TypeError(`invalid hex: expected ${opts.length} bytes, got ${bytes}`);
    }
  }
}

export function hexToBytes(hex: Hex): Uint8Array {
  assertHex(hex);
  const body = hex.slice(2).toLowerCase();
  const out = new Uint8Array(body.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(body.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(b: Uint8Array): Hex {
  const hex = Array.from(b)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
  return (`0x${hex}`) as Hex;
}

export function leftPadTo32(b: Uint8Array): Uint8Array {
  if (b.length > 32) throw new TypeError('value too large to left-pad to 32 bytes');
  if (b.length === 32) return b;
  const out = new Uint8Array(32);
  out.set(b, 32 - b.length);
  return out;
}

export function uint256ToBytes32(value: bigint): Uint8Array {
  if (typeof value !== 'bigint') throw new TypeError('uint256 must be a bigint');
  if (value < 0n) throw new RangeError('uint256 must be >= 0');
  const out = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n) throw new RangeError('uint256 too large');
  return out;
}

export function addressToBytes32(addr: Address): Uint8Array {
  if (typeof addr !== 'string' || !addr.startsWith('0x')) throw new TypeError('invalid address');
  const hex = addr.slice(2);
  if (hex.length !== 40) throw new TypeError('invalid address');
  if (!/^[0-9a-fA-F]{40}$/.test(hex)) throw new TypeError('invalid address');
  const bytes = new Uint8Array(20);
  for (let i = 0; i < 20; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return leftPadTo32(bytes);
}
