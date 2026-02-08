import type { Address, Hex } from './types';
import { abiEncode } from './abi';
import { hexToBytes, bytesToHex } from './bytes';
import { keccak256 } from './keccak';
import { domainTypeHash, safeMessageTypeHash } from './constants';

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function ensureHex32(hex: Hex): Uint8Array {
  const b = hexToBytes(hex);
  if (b.length !== 32) throw new TypeError('hex must be 32 bytes');
  return b;
}

function normalizePayloadToBytes(payload: Uint8Array | Hex): Uint8Array {
  if (payload instanceof Uint8Array) return payload;
  if (typeof payload === 'string' && payload.startsWith('0x')) return hexToBytes(payload as Hex);
  throw new TypeError('payload must be Uint8Array or 0x-hex');
}

export function buildSafeDomainSeparator(args: { chainId: bigint; safeAddress: Address }): Hex {
  const { chainId, safeAddress } = args;
  if (chainId <= 0n) throw new RangeError('chainId must be > 0');
  // address validation occurs via addressToBytes32 inside abiEncode
  const typeHashBytes = ensureHex32(domainTypeHash());
  const encoded = abiEncode([
    { type: 'bytes32', value: typeHashBytes },
    { type: 'uint256', value: chainId },
    { type: 'address', value: safeAddress },
  ]);
  return keccak256(encoded);
}

export function computeSafeMessageHash(payload: Uint8Array | Hex): Hex {
  const bytes = normalizePayloadToBytes(payload);
  const payloadHashBytes = hexToBytes(keccak256(bytes));
  const typeHashBytes = ensureHex32(safeMessageTypeHash());
  const combined = concatBytes(typeHashBytes, payloadHashBytes);
  return keccak256(combined);
}

export function computeSafeHash(args: { payload: Uint8Array | Hex; chainId: bigint; safeAddress: Address }): Hex {
  const domain = buildSafeDomainSeparator({ chainId: args.chainId, safeAddress: args.safeAddress });
  const safeMsg = computeSafeMessageHash(args.payload);
  const prefix = new Uint8Array([0x19, 0x01]);
  const bytes = concatBytes(prefix, hexToBytes(domain), hexToBytes(safeMsg));
  return keccak256(bytes);
}

export const __internal = { concatBytes, normalizePayloadToBytes, ensureHex32, bytesToHex };
