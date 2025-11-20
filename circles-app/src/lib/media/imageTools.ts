// src/lib/media/imageTools.ts
// Shared browser-only image utilities for file → cropped data URL, size checks, etc.

export const MEDIA_MAX_BYTES = 8 * 1024 * 1024; // generic 8 MiB limit
export const AVATAR_PREFERRED_MAX_BYTES = 150 * 1024; // soft avatar budget (~150 KiB)

export type ImageCropConfig = {
  width: number;
  height: number;
  mime?: string;
  quality?: number;
  maxBytes?: number;
};

/**
 * Read a File into a data: URL.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected FileReader result type'));
        return;
      }
      resolve(result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Load an HTMLImageElement from a data URL or normal URL.
 */
export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

/**
 * Detect if a string is a base64 data URL.
 */
export function isDataUrl(s: string | null | undefined): boolean {
  if (!s) return false;
  return /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+)?(;charset=[^;]+)?;base64,/.test(s);
}

/**
 * Parse a base64 data URL to mime + bytes.
 */
export function parseDataUrlToBytes(dataUrl: string): { mime: string | null; bytes: Uint8Array } {
  const match = dataUrl.match(/^data:([^;,]+)?(?:;charset=[^;]+)?;base64,(.*)$/);
  if (!match) {
    throw new Error('Unsupported data URL format');
  }
  const mime = match[1] || null;
  const b64 = match[2];
  const hasAtob = typeof atob === 'function';
  const binary = hasAtob ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');

  const len = binary.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return { mime, bytes: out };
}

/**
 * Helper if callers only care about bytes.
 */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  return parseDataUrlToBytes(dataUrl).bytes;
}

/**
 * Cover-style crop+scale into a fixed canvas size.
 * Returns data URL + bytes + original dimensions.
 */
export async function fileToCroppedDataUrl(
  file: File,
  cfg: ImageCropConfig,
): Promise<{
  dataUrl: string;
  bytes: Uint8Array;
  originalWidth: number;
  originalHeight: number;
}> {
  const { width, height, mime = 'image/jpeg', quality = 0.9, maxBytes } = cfg;

  if (width <= 0 || height <= 0) {
    throw new Error('Invalid crop dimensions');
  }

  const srcDataUrl = await fileToDataUrl(file);
  const img = await loadHtmlImage(srcDataUrl);

  const srcW = img.width;
  const srcH = img.height;
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    throw new Error('Image has invalid dimensions');
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not acquire 2D canvas context');
  }

  canvas.width = width;
  canvas.height = height;

  const scale = Math.max(width / srcW, height / srcH);
  const targetW = srcW * scale;
  const targetH = srcH * scale;
  const offsetX = (width - targetW) / 2;
  const offsetY = (height - targetH) / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, offsetX, offsetY, targetW, targetH);

  const dataUrl = canvas.toDataURL(mime, quality);
  const { bytes } = parseDataUrlToBytes(dataUrl);

  if (maxBytes != null && bytes.length > maxBytes) {
    throw new Error(`Image too large: ${bytes.length} bytes > ${maxBytes}`);
  }

  return {
    dataUrl,
    bytes,
    originalWidth: srcW,
    originalHeight: srcH,
  };
}
