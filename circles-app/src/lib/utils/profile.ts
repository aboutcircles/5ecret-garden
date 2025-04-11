import type { Profile } from '@circles-sdk/profiles';
import type { AvatarRow } from '@circles-sdk/data';
import { get } from 'svelte/store';
import { circles } from '$lib/stores/circles';
import { shortenAddress } from '$lib/utils/shared';
import type { Address } from '@circles-sdk/utils';
import { BatchAggregator } from '$lib/utils/batchAggregator';

/**
 * In-memory cache of <address -> Profile Promise>,
 * so repeated calls for the same address share the same result.
 */
const profileCache = new Map<string, Promise<Profile>>();

export function removeProfileFromCache(address: string) {
  profileCache.delete(address);
}

/**
 * Our fallback logic for building a profile if IPFS data is empty or partial.
 */
function setFallbackValues(
  address: string,
  avatar: AvatarRow | undefined,
  profile: Profile | undefined,
): Profile {
  const fallbackProfile: Profile = {
    name: shortenAddress(address),
    previewImageUrl: '/logo.svg',
  };

  // Assign the correct fallback image
  if (!profile?.previewImageUrl && (avatar?.type === 'CrcV2_RegisterHuman' || avatar?.type === 'CrcV1_Signup')) {
    fallbackProfile.previewImageUrl = '/person.svg';
  }
  if (avatar?.type === 'CrcV2_RegisterGroup') {
    fallbackProfile.previewImageUrl = '/group.svg';
  }
  if (avatar?.type === 'CrcV2_RegisterOrganization') {
    fallbackProfile.previewImageUrl = '/organization.svg';
  }

  // Use avatar's name if set
  if (avatar?.name) {
    fallbackProfile.name = avatar.name;
  }

  if (!profile) {
    return fallbackProfile;
  }

  if ((profile.name?.trim() ?? '') === '') {
    profile.name = fallbackProfile.name;
  }
  if (!profile.previewImageUrl || profile.previewImageUrl.trim() === '') {
    profile.previewImageUrl = fallbackProfile.previewImageUrl;
  }

  return profile;
}

/**
 * This is the function we provide to the aggregator:
 *    - Takes a list of addresses
 *    - Calls `getAvatarInfoBatch`
 *    - Collects CIDs, calls `profiles.getMany` in a single call or chunk if needed
 *    - Builds final Profiles in a Map(address->Profile)
 */
async function fetchProfiles(addresses: Address[]): Promise<Map<Address, Profile>> {
  const sdk = get(circles);
  if (!sdk) throw new Error('No SDK instance found.');
  if (!sdk.profiles) throw new Error('No sdk.profiles instance found. Is the profile service url configured?');

  // 1) Fetch avatar info for all addresses in one go
  const avatars = await sdk.data.getAvatarInfoBatch(addresses);

  // 2) Build a map address->avatar for convenience
  const addressToAvatar = new Map<string, AvatarRow>();
  for (const avatar of avatars) {
    addressToAvatar.set(avatar.avatar.toLowerCase(), avatar);
  }

  // 3) Gather all CIDs
  const cids: string[] = avatars
    .filter((a) => a.cidV0)
    .map((a) => a.cidV0!);

  const uniqueCids = [...new Set(cids)];

  // 4) Because `profiles.getMany` is limited to 50, we chunk it if needed
  const cidToProfile: Record<string, Profile> = {};
  const chunkSize = 50;
  for (let i = 0; i < uniqueCids.length; i += chunkSize) {
    const chunk = uniqueCids.slice(i, i + chunkSize);
    const chunkProfiles = await sdk.profiles.getMany(chunk);
    for (const [cid, prof] of Object.entries(chunkProfiles)) {
      cidToProfile[cid] = prof;
    }
  }

  // 5) Build final map of address->Profile
  const resultMap = new Map<Address, Profile>();
  for (const address of addresses) {
    const avatar = addressToAvatar.get(address.toLowerCase());
    let profile: Profile | undefined;
    if (avatar && avatar.cidV0) {
      profile = cidToProfile[avatar.cidV0];
    }
    const finalProfile = setFallbackValues(address, avatar, profile);
    resultMap.set(address, finalProfile);
  }

  return resultMap;
}

/**
 * Create a single aggregator for addresses -> Profiles,
 * configured with a 20ms wait time and batch size 50.
 */
const profileAggregator = new BatchAggregator<Address, Profile>({
  waitTimeMs: 20,
  maxBatchSize: 50,
  fetchFunction: fetchProfiles,
});

/**
 * Our main getProfile function:
 *   1. If it's one of the special-case addresses, return a static profile.
 *   2. Check the cache.
 *   3. Otherwise, aggregator.enqueue(address).
 */
export async function getProfile(address: Address): Promise<Profile> {
  // Some special-case addresses we handle immediately
  if (address === '0x0000000000000000000000000000000000000001') {
    return {
      name: 'Transitive transfer',
      previewImageUrl: '/circles-token.svg',
    };
  }

  const $circles = get(circles);
  if (address === $circles?.circlesConfig.v2HubAddress?.toLowerCase()) {
    return {
      name: 'Circles V2 Hub Contract',
      previewImageUrl: '/logo.svg',
    };
  }
  if (address === $circles?.circlesConfig.migrationAddress?.toLowerCase()) {
    return {
      name: 'Circles V2 Migration Contract',
      previewImageUrl: '/logo.svg',
    };
  }

  // Check the local promise cache
  const cached = profileCache.get(address);
  if (cached) {
    return cached;
  }

  // Not cached -> aggregator
  const profilePromise = profileAggregator.enqueue(address);

  // Store it in the cache so subsequent calls don't re-enqueue
  profileCache.set(address, profilePromise);

  return profilePromise;
}
