import type { Address } from '@circles-sdk/utils';
import { getProfile } from '$lib/shared/utils/profile';
import { shortenAddress } from '$lib/shared/utils/shared';

export async function getProfileDisplayName(address: Address | string): Promise<string> {
  const addr = String(address);
  try {
    const profile = await getProfile(addr as Address);
    const name = profile?.name?.trim();
    if (name && name.length > 0) return name;
  } catch {
    // Fallback to shortened address below.
  }
  return shortenAddress(addr);
}
