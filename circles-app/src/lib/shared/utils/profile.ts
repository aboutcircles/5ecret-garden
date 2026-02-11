// Thin shim around the new profiles module (core + full repos)
export { FallbackImageUrl } from '$lib/shared/model/profile';
export { getProfileCore as getProfile } from '$lib/shared/model/profile';
import { invalidateProfileCore, invalidateProfileFull } from '$lib/shared/model/profile';
export { invalidateProfileFull } from '$lib/shared/model/profile';

export type { AppProfileCore as Profile } from '$lib/shared/model/profile';

export function removeProfileFromCache(address: string) {
  try { invalidateProfileCore(address as any); } catch {}
  try { invalidateProfileFull(address as any); } catch {}
}

export function profilesEqual(a: any, b: any): boolean {
  if (!a || !b) return false;
  return (
    a.name === b.name &&
    a.description === b.description &&
    a.previewImageUrl === b.previewImageUrl &&
    a.imageUrl === b.imageUrl &&
    a.location === b.location
  );
}
