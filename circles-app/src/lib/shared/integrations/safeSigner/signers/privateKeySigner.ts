// lib/safeSigner/signers/privateKeySigner.ts
import type { DigestSigner, Hex } from '../types';
import { hexToBytes, bytesToHex, uint256ToBytes32 } from '../bytes';
import { secp256k1 } from '@noble/curves/secp256k1';

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Signs a 32-byte digest with a raw private key.
 * - Enforces 32-byte PK
 * - Enforces 32-byte digest
 * - Uses noble's low-s default
 * - Derives recovery id by trying 0/1 via Signature.recoverPublicKey
 */
export function privateKeySigner(pk: Hex): DigestSigner {
  const pkBytes = hexToBytes(pk);
  if (pkBytes.length !== 32) {
    throw new TypeError('private key must be 32 bytes');
  }

  return {
    async signDigest(digest: Hex) {
      const msg = hexToBytes(digest);
      if (msg.length !== 32) {
        throw new TypeError('digest must be 32 bytes');
      }

      const sig = secp256k1.sign(msg, pkBytes); // low-s enforced by noble
      const rBytes = uint256ToBytes32(sig.r);
      const sBytes = uint256ToBytes32(sig.s);

      const r = bytesToHex(rBytes);
      const s = bytesToHex(sBytes);

      const pubUncompressed = secp256k1.getPublicKey(pkBytes, false);

      const compact = new Uint8Array(64);
      compact.set(rBytes, 0);
      compact.set(sBytes, 32);

      const recoveryCandidates: ReadonlyArray<0 | 1> = [0, 1];
      let recId: 0 | 1 | undefined;

      for (const i of recoveryCandidates) {
        const recPoint = secp256k1.Signature.fromCompact(compact)
          .addRecoveryBit(i)
          .recoverPublicKey(msg);
        const recPubUncompressed = recPoint.toRawBytes(false);
        const matches = bytesEqual(recPubUncompressed, pubUncompressed);
        if (matches) {
          recId = i;
          break;
        }
      }

      if (recId === undefined) {
        throw new Error('failed to compute recovery id');
      }

      const v = (recId + 27) as 27 | 28;
      return { r, s, v };
    },
  };
}
