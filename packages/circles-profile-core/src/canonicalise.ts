import type { CustomDataLink } from './links';

export class CanonicalisationError extends Error {}
export class ObjectTooLargeError extends Error {}

function canonicalize(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map((v) => canonicalize(v)).join(',') + ']';
  const keys = Object.keys(value).sort();
  const parts: string[] = [];
  for (const k of keys) {
    parts.push(JSON.stringify(k) + ':' + canonicalize((value as any)[k]));
  }
  return '{' + parts.join(',') + '}';
}

function toHex(bytes: Uint8Array): `0x${string}` {
  return ('0x' +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')) as `0x${string}`;
}

export function canonicaliseLink(link: CustomDataLink): Uint8Array {
  const required: (keyof CustomDataLink)[] = [
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
    'signature',
  ];
  for (const k of required) {
    if (!(k in (link as any))) throw new CanonicalisationError(`Missing key ${String(k)}`);
  }

  const preimage: any = { ...link };
  delete preimage.signature;

  const json = canonicalize(preimage);
  if (!json || typeof json !== 'string' || json.length === 0) {
    throw new CanonicalisationError('Canonicalization produced empty output');
  }

  const bytes = new TextEncoder().encode(json);
  const cap = 8 * 1024 * 1024;
  if (bytes.length > cap) throw new ObjectTooLargeError('Link preimage exceeds 8 MiB');
  return bytes;
}

export async function buildLinkDraft(args: {
  name: string;
  cid: string;
  chainId: number;
  signerAddress: string;
  nowSec?: number;
}): Promise<CustomDataLink> {
  const now = args.nowSec ?? Math.floor(Date.now() / 1000);
  const nonceBytes = new Uint8Array(16);
  if (!globalThis.crypto?.getRandomValues) {
    for (let i = 0; i < nonceBytes.length; i++) nonceBytes[i] = Math.floor(Math.random() * 256);
  } else {
    globalThis.crypto.getRandomValues(nonceBytes);
  }
  const nonce = toHex(nonceBytes);

  const link: CustomDataLink = {
    '@context': 'https://aboutcircles.com/contexts/circles-linking/',
    '@type': 'CustomDataLink',
    name: args.name,
    cid: args.cid,
    encrypted: false,
    encryptionAlgorithm: null,
    encryptionKeyFingerprint: null,
    chainId: args.chainId,
    signerAddress: args.signerAddress,
    signedAt: now,
    nonce,
    signature: '',
  };
  return link;
}
