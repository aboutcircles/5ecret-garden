import type { Address, DigestSigner, Hex } from './types';
import { computeSafeHash, buildSafeDomainSeparator } from './safeHash';
import { hexToBytes, bytesToHex } from './bytes';
import { secp256k1 } from '@noble/curves/secp256k1';

function isValidAddress(addr: string): addr is Address {
  return typeof addr === 'string' && addr.startsWith('0x') && /^[0-9a-fA-F]{40}$/.test(addr.slice(2));
}


function isLowS(sHex: Hex): boolean {
  const n = secp256k1.CURVE.n; // group order
  const halfN = n >> 1n;
  const s = BigInt(sHex);
  return s <= halfN && s > 0n;
}

function assertRSV({ r, s, v }: { r: Hex; s: Hex; v: number }) {
  if (v !== 27 && v !== 28) throw new TypeError('invalid v: must be 27 or 28');
  // length checks via hexToBytes
  const rLen = hexToBytes(r).length;
  const sLen = hexToBytes(s).length;
  if (rLen !== 32 || sLen !== 32) throw new TypeError('invalid r/s length');
  if (!isLowS(s)) throw new Error('non-canonical s');
}

export async function signSafePayload(args: {
  payload: Uint8Array | Hex;
  chainId: bigint;
  safeAddress: Address;
  signer: DigestSigner;
}): Promise<Hex> {
  const { payload, chainId, safeAddress, signer } = args;
  if (chainId <= 0n) throw new RangeError('chainId must be > 0');
  if (!isValidAddress(safeAddress)) throw new TypeError('invalid address');
  const digest = computeSafeHash({ payload, chainId, safeAddress });
  const { r, s, v } = await signer.signDigest(digest);
  assertRSV({ r, s, v });
  // concatenate r||s||v
  const rb = hexToBytes(r);
  const sb = hexToBytes(s);
  const vb = new Uint8Array([v]);
  const out = new Uint8Array(65);
  out.set(rb, 0);
  out.set(sb, 32);
  out.set(vb, 64);
  return bytesToHex(out);
}

export function createSafeSigner(config: {
  chainId: bigint;
  safeAddress: Address;
  signer: DigestSigner;
}) {
  const { chainId, safeAddress, signer } = config;
  if (chainId <= 0n) throw new RangeError('chainId must be > 0');
  if (!isValidAddress(safeAddress)) throw new TypeError('invalid address');
  const domainSeparator = buildSafeDomainSeparator({ chainId, safeAddress });
  return {
    domainSeparator(): Hex {
      return domainSeparator;
    },
    computeHash(payload: Uint8Array | Hex): Hex {
      return computeSafeHash({ payload, chainId, safeAddress });
    },
    async sign(payload: Uint8Array | Hex): Promise<Hex> {
      return signSafePayload({ payload, chainId, safeAddress, signer });
    },
  };
}
