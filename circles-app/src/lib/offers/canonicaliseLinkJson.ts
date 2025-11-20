import canonicalize from 'canonicalize';
import { ObjectTooLargeError, CanonicalisationError } from './errors';
import type { CustomDataLink } from './jsonld';

const SIZE_LIMIT = 8 * 1024 * 1024; // 8 MiB

type Json =
    | null
    | boolean
    | number
    | string
    | Json[]
    | { [k: string]: Json };

/**
 * RFC 8785 canonicalization (JCS) over JSON text, skipping the top-level "signature" field.
 * Returns UTF-8 bytes of the canonical JSON string.
 */
export function canonicaliseLink(linkObj: CustomDataLink): Uint8Array {
    // Validate that all required keys are present, but allow future extensions.
    // Only the top-level "signature" field is excluded from the canonicalised preimage.
    const requiredKeys = [
        '@context',
        '@type',
        'name',
        'cid',
        'encrypted',
        'encryptionAlgorithm',
        'encryptionKeyFingerprint',
        'chainId',
        'signerAddress',
        'signedAt',
        'nonce',
    ] as const;

    for (const k of requiredKeys) {
        if (!(k in (linkObj as any))) {
            throw new CanonicalisationError(`CustomDataLink missing required key: ${k as string}`);
        }
    }

    const shallow: Record<string, Json> = {};
    for (const k of Object.keys(linkObj)) {
        if (k === 'signature') {
            continue;
        }
        shallow[k] = (linkObj as any)[k] as Json;
    }

    const canonText = canonicalize(shallow);
    if (typeof canonText !== 'string' || canonText.length === 0) {
        throw new CanonicalisationError('canonicalize: empty output');
    }

    const bytes = new TextEncoder().encode(canonText);
    if (bytes.length > SIZE_LIMIT) {
        throw new ObjectTooLargeError(bytes.length, SIZE_LIMIT);
    }
    return bytes;
}
