import type { Address } from './types';
import { addressToBytes32, uint256ToBytes32 } from './bytes';

export type AbiItem =
  | { type: 'bytes32'; value: Uint8Array }
  | { type: 'uint256'; value: bigint }
  | { type: 'address'; value: Address };

export function abiEncode(items: AbiItem[]): Uint8Array {
  const out = new Uint8Array(items.length * 32);
  let offset = 0;
  for (const it of items) {
    let enc: Uint8Array;
    if (it.type === 'bytes32') {
      if (!(it.value instanceof Uint8Array) || it.value.length !== 32)
        throw new TypeError('bytes32 must be 32 bytes');
      enc = it.value;
    } else if (it.type === 'uint256') {
      if (typeof it.value !== 'bigint') throw new TypeError('uint256 must be bigint');
      enc = uint256ToBytes32(it.value);
    } else if (it.type === 'address') {
      enc = addressToBytes32(it.value);
    } else {
      // @ts-expect-unreachable narrow types above
      throw new TypeError('unsupported ABI type');
    }
    out.set(enc, offset);
    offset += 32;
  }
  return out;
}
