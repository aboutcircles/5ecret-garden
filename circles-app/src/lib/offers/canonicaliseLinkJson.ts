import {ObjectTooLargeError} from './errors';
import canonicalize from 'canonicalize';

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
export function canonicaliseLink(linkObj: Record<string, Json>): Uint8Array {
    const shallow: Record<string, Json> = {};
    for (const k of Object.keys(linkObj)) {
        if (k === 'signature') {
            continue;
        }
        shallow[k] = linkObj[k];
    }

    const canonText = canonicalize(shallow);
    if (typeof canonText !== 'string' || canonText.length === 0) {
        throw new Error('canonicalize: empty output');
    }

    const bytes = new TextEncoder().encode(canonText);
    if (bytes.length > SIZE_LIMIT) {
        throw new ObjectTooLargeError(bytes.length, SIZE_LIMIT);
    }
    return bytes;
}
