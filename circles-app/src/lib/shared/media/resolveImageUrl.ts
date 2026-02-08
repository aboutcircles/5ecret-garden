// src/lib/media/resolveImageUrl.ts
// Resolve a product image string (http(s), ipfs://, bare CIDv0, data URL) to a final http(s) URL.

import { isDataUrl, parseDataUrlToBytes } from '$lib/shared/media/imageTools';

const CIDV0_RE = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;

export type MediaPinBindings = {
  gatewayUrlForCid: (cid: string) => string;
  pinMediaBytes: (bytes: Uint8Array, mime?: string | null) => Promise<string>;
};

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalize a single image reference to an http(s) URL, pinning if needed.
 */
export async function resolveImageToHttpUrl(
  img: string,
  bindings: MediaPinBindings,
): Promise<string> {
  // Already an absolute http(s) URL?
  if (isHttpUrl(img)) {
    return img;
  }

  // ipfs://CID
  if (img.startsWith('ipfs://')) {
    const cid = img.slice('ipfs://'.length);
    return bindings.gatewayUrlForCid(cid);
  }

  // Bare CIDv0
  if (CIDV0_RE.test(img)) {
    return bindings.gatewayUrlForCid(img);
  }

  // data: URL → pin-media
  if (isDataUrl(img)) {
    const { mime, bytes } = parseDataUrlToBytes(img);
    const cid = await bindings.pinMediaBytes(bytes, mime);
    return bindings.gatewayUrlForCid(cid);
  }

  // Last resort: treat as URL if parsable http(s)
  if (isHttpUrl(img)) {
    return img;
  }

  throw new Error(
    'Unsupported image format. Please provide an http(s) URL, ipfs://CID, bare CID, or upload an image.',
  );
}

/**
 * Convenience: resolve an array of image strings to http(s) URLs.
 */
export async function resolveImagesToHttpUrls(
  imgs: string[],
  bindings: MediaPinBindings,
): Promise<string[]> {
  return Promise.all(imgs.map((img) => resolveImageToHttpUrl(img, bindings)));
}
