import type { Address } from '@aboutcircles/sdk-types';
import { getProfile } from '$lib/shared/utils/profile';
import { shortenAddress } from '$lib/shared/utils/shared';
import type { ProfileAddress } from '$lib/shared/model/profile';

export async function getProfileDisplayName(address: Address | string): Promise<string> {
  const addr = address.toLowerCase() as ProfileAddress;
  try {
    const profile = await getProfile(addr);
    const name = profile?.name?.trim();
    if (name && name.length > 0) return name;
  } catch {
    // Fallback to shortened address below.
  }
  return shortenAddress(addr);
}
