import type { Profile } from '@aboutcircles/sdk-types';

import { parseDataUrlToBytes } from '$lib/shared/media/imageTools';

export const PROFILE_VALIDATION_CONFIG = {
  maxNameLength: 36,
  descriptionLength: 500,
  maxImageSizeKB: 150,
  imageUrlLength: 2000,
};

async function validateImageDataUrl(dataUrl: string): Promise<boolean> {
  const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|svg\+xml);base64,/;
  if (!dataUrlPattern.test(dataUrl)) {
    return false;
  }

  try {
    const { bytes } = parseDataUrlToBytes(dataUrl);
    return bytes.length <= PROFILE_VALIDATION_CONFIG.maxImageSizeKB * 1024;
  } catch {
    return false;
  }
}

export async function validateProfile(profile: Profile): Promise<string[]> {
  const errors: string[] = [];
  const config = PROFILE_VALIDATION_CONFIG;

  if (!profile.name || typeof profile.name !== 'string' || profile.name.length > config.maxNameLength) {
    errors.push(
      `Name is required and must be a string with a maximum length of ${config.maxNameLength} characters.`
    );
  }

  if (profile.description && (typeof profile.description !== 'string' || profile.description.length > config.descriptionLength)) {
    errors.push(`Description must be a string and cannot exceed ${config.descriptionLength} characters.`);
  }

  if (profile.previewImageUrl) {
    const isValidImage = await validateImageDataUrl(profile.previewImageUrl);
    if (!isValidImage) {
      errors.push(`Invalid preview image data URL, or size exceeds ${config.maxImageSizeKB}KB.`);
    }
  }

  if (profile.imageUrl && (typeof profile.imageUrl !== 'string' || profile.imageUrl.length > config.imageUrlLength)) {
    errors.push(`Image URL must be a string and cannot exceed ${config.imageUrlLength} characters.`);
  }

  return errors;
}
