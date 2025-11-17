import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex } from './bytes';
import type { Hex } from './types';

export function keccak256(data: Uint8Array): Hex {
  const out = keccak_256.create();
  out.update(data);
  const digest = out.digest();
  return bytesToHex(new Uint8Array(digest));
}

export function utf8ToBytes(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  // Minimal utf-8 encoding fallback without external imports
  const codePoints = Array.from(str);
  const bytes: number[] = [];
  for (const ch of codePoints) {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0x7f) bytes.push(cp);
    else if (cp <= 0x7ff) {
      bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp <= 0xffff) {
      bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}
