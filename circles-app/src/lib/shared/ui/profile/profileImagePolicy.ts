import { parseDataUrlToBytes } from '$lib/shared/media/imageTools';

export const PROFILE_IMAGE_CROP_WIDTH = 256;
export const PROFILE_IMAGE_CROP_HEIGHT = 256;
export const PROFILE_IMAGE_OUTPUT_MIME = 'image/jpeg';
export const PROFILE_IMAGE_OUTPUT_QUALITY = 0.85;

// Keep profile previews lightweight and predictable.
export const PROFILE_IMAGE_MAX_BYTES = 150 * 1024;

const PROFILE_IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|gif|svg\+xml);base64,/i;

export function isValidProfilePreviewImageDataUrl(dataUrl: string): boolean {
  if (!PROFILE_IMAGE_DATA_URL_PATTERN.test(dataUrl)) {
    return false;
  }

  try {
    const { bytes } = parseDataUrlToBytes(dataUrl);
    return bytes.length <= PROFILE_IMAGE_MAX_BYTES;
  } catch {
    return false;
  }
}
