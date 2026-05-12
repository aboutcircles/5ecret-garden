import type { Profile } from '@aboutcircles/sdk-profiles';

import {
  isValidProfilePreviewImageDataUrl,
  PROFILE_IMAGE_MAX_BYTES,
} from '$lib/shared/ui/profile/profileImagePolicy';
import { isDataUrl } from '$lib/shared/media/imageTools';

export const PROFILE_VALIDATION_CONFIG = {
  maxNameLength: 36,
  descriptionLength: 500,
  maxImageSizeKB: Math.floor(PROFILE_IMAGE_MAX_BYTES / 1024),
  imageUrlLength: 2000,
};

async function validateImageDataUrl(dataUrl: string): Promise<boolean> {
  return isValidProfilePreviewImageDataUrl(dataUrl);
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

  if (
    profile.imageUrl &&
    typeof profile.imageUrl === 'string' &&
    isDataUrl(profile.imageUrl)
  ) {
    // Backward compatibility: historically some flows stored data URLs in imageUrl.
    // Treat as valid here; previewImageUrl validation already enforces strict image limits.
  } else if (profile.imageUrl && (typeof profile.imageUrl !== 'string' || profile.imageUrl.length > config.imageUrlLength)) {
    errors.push(`Image URL must be a string and cannot exceed ${config.imageUrlLength} characters.`);
  }

  return errors;
}
