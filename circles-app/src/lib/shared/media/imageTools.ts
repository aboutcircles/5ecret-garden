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

export type ImageFitConfig = {
  maxWidth?: number;
  maxHeight?: number;
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

/**
 * Fit-style downscale into a canvas that preserves aspect ratio. Never upscales.
 * If neither maxWidth nor maxHeight is provided, keeps original dimensions.
 * Returns data URL + bytes (same shape as crop helper for convenience).
 */
export async function fileToFittedDataUrl(
  file: File,
  cfg: ImageFitConfig,
): Promise<{ dataUrl: string; bytes: Uint8Array }> {
  const {
    maxWidth,
    maxHeight,
    mime = 'image/jpeg',
    quality = 0.9,
    maxBytes,
  } = cfg ?? {} as ImageFitConfig;

  const srcDataUrl = await fileToDataUrl(file);
  const img = await loadHtmlImage(srcDataUrl);

  const srcW = img.width;
  const srcH = img.height;
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    throw new Error('Image has invalid dimensions');
  }

  // Determine target size with preserved aspect ratio, no upscaling.
  let targetW = srcW;
  let targetH = srcH;

  if (typeof maxWidth === 'number' || typeof maxHeight === 'number') {
    const mw = typeof maxWidth === 'number' && maxWidth > 0 ? maxWidth : Infinity;
    const mh = typeof maxHeight === 'number' && maxHeight > 0 ? maxHeight : Infinity;
    const scale = Math.min(mw / srcW, mh / srcH, 1); // never upscale
    if (scale < 1) {
      targetW = Math.max(1, Math.floor(srcW * scale));
      targetH = Math.max(1, Math.floor(srcH * scale));
    }
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not acquire 2D canvas context');
  }
  canvas.width = targetW;
  canvas.height = targetH;
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Helper to encode with a given quality and check size
  const encode = (q: number) => {
    const du = canvas.toDataURL(mime, q);
    const { bytes } = parseDataUrlToBytes(du);
    return { du, bytes } as const;
  };

  let q = quality;
  let { du, bytes } = encode(q);
  if (maxBytes != null && bytes.length > maxBytes) {
    // Try a few lower qualities before giving up.
    const triedQualities = [0.85, 0.8, 0.75, 0.7, 0.65, 0.6];
    for (const candidate of triedQualities) {
      if (candidate >= q) continue;
      ({ du, bytes } = encode(candidate));
      if (bytes.length <= maxBytes) {
        q = candidate;
        break;
      }
    }
    if (bytes.length > maxBytes) {
      throw new Error(`Image too large after fitting: ${bytes.length} bytes > ${maxBytes}`);
    }
  }

  return { dataUrl: du, bytes };
}
