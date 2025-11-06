import { InvalidAddressError } from './errors';
import type { Hex } from './cid';
import { keccak256 as keccakHex, toUtf8Bytes, AbiCoder, getAddress, concat } from 'ethers';

export type Address = `0x${string}`;

export function normalizeAddress(s: string): Address {
  if (typeof s !== 'string') throw new InvalidAddressError('address', String(s));
  const v = s.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(v)) throw new InvalidAddressError('address', s);
  return v as Address;
}

export function isAbsoluteUri(s: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

export function keccak256(data: Uint8Array): Hex {
  return keccakHex(data) as Hex;
}

export function hexToBytes(hex: Hex): Uint8Array {
  const h = hex.slice(2);
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): Hex {
  let hex = '0x';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex as Hex;
}

export function computeSafeHash(chainId: bigint, safe: Address, payloadBytes: Uint8Array): Hex {
  const abi = new AbiCoder();

  const typeHashDomain = keccakHex(toUtf8Bytes('EIP712Domain(uint256 chainId,address verifyingContract)'));
  const typeHashMsg    = keccakHex(toUtf8Bytes('SafeMessage(bytes message)'));
  const payloadHash    = keccakHex(payloadBytes);

  const safeMsg = keccakHex(abi.encode(['bytes32','bytes32'], [typeHashMsg, payloadHash]));
  const domain = keccakHex(abi.encode(['bytes32','uint256','address'], [typeHashDomain, chainId, getAddress(safe)]));
  const finalBytes = concat([Uint8Array.from([0x19, 0x01]), hexToBytes(domain), hexToBytes(safeMsg)]);
  return keccakHex(finalBytes) as Hex;
}
