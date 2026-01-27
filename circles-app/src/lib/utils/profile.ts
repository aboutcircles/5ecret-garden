import type { Profile } from '@aboutcircles/sdk-types';
import type { AvatarInfo } from '@aboutcircles/sdk-types';
import { get } from 'svelte/store';
import { circles } from '$lib/stores/circles';
import { shortenAddress } from '$lib/utils/shared';
import type { Address } from '@aboutcircles/sdk-types';
import { BatchAggregator } from '$lib/utils/batchAggregator';
import { validateProfileBatchResults } from '$lib/utils/sdkAdapters';
import { getEnrichedProfile } from '$lib/stores/transactionHistory';

/**
 * In-memory cache of <address -> Profile Promise>,
 * so repeated calls for the same address share the same result.
 */
const profileCache = new Map<string, Promise<Profile>>();

/**
 * In-memory cache of <address -> AvatarInfo>,
 * populated during profile fetches to avoid redundant API calls.
 */
const avatarInfoCache = new Map<string, AvatarInfo>();

export function removeProfileFromCache(address: string) {
  profileCache.delete(address);
  avatarInfoCache.delete(address);
}

/**
 * Our fallback logic for building a profile if IPFS data is empty or partial.
 */
export enum FallbackImageUrl {
  Person = '/person.svg',
  Group = '/group.svg',
  Organization = '/organization.svg',
  Logo = '/logo.svg',
}

function setFallbackValues(
  address: string,
  avatar: AvatarInfo | undefined,
  profile: Profile | undefined
): Profile {
  const fallbackProfile: Profile = {
    name: shortenAddress(address),
    previewImageUrl: FallbackImageUrl.Logo,
  };

  // Assign the correct fallback image
  if (
    !profile?.previewImageUrl &&
    (avatar?.type === 'CrcV2_RegisterHuman' || avatar?.type === 'CrcV1_Signup')
  ) {
    fallbackProfile.previewImageUrl = FallbackImageUrl.Person;
  }
  if (avatar?.type === 'CrcV2_RegisterGroup') {
    fallbackProfile.previewImageUrl = FallbackImageUrl.Group;
  }
  if (avatar?.type === 'CrcV2_RegisterOrganization') {
    fallbackProfile.previewImageUrl = FallbackImageUrl.Organization;
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
async function fetchProfiles(
  addresses: Address[]
): Promise<Map<Address, Profile>> {
  const sdk = get(circles);
  if (!sdk) throw new Error('No SDK instance found.');
  if (!sdk.profiles)
    throw new Error(
      'No sdk.profiles instance found. Is the profile service url configured?'
    );

  // 1) Fetch avatar info for all addresses in one go
  let avatars: AvatarInfo[];

  // Validate SDK is properly initialized
  if (!sdk || typeof sdk !== 'object') {
    console.error('SDK is not properly initialized:', sdk);
    return new Map();
  }

  // Use SDK's RPC methods directly (properly typed via Sdk class)
  if (typeof sdk.rpc?.avatar?.getAvatarInfoBatch === 'function') {
    console.log('Using SDK rpc.avatar.getAvatarInfoBatch()');
    avatars = await sdk.rpc.avatar.getAvatarInfoBatch(addresses);
  } else {
    console.error(
      'No rpc.avatar.getAvatarInfoBatch method available on SDK'
    );
    return new Map();
  }

  // 2) Build a map address->avatar for convenience
  // Filter out null/undefined avatars (addresses that don't have registered avatars)
  const addressToAvatar = new Map<string, AvatarInfo>();
  for (const avatar of avatars) {
    if (avatar && avatar.avatar) {
      const lowerAddress = avatar.avatar.toLowerCase();
      addressToAvatar.set(lowerAddress, avatar);
      // Also cache avatar info to avoid redundant fetches
      avatarInfoCache.set(lowerAddress, avatar);
    }
  }

  // 3) Gather all CIDs
  const cids: string[] = avatars
    .filter((a: AvatarInfo) => a && a.cidV0)
    .map((a: AvatarInfo) => a.cidV0!);

  const uniqueCids = [...new Set(cids)];

  // 4) Chunk CID requests to 100 to match aggregator batch size
  // This reduces the number of RPC calls and aligns with the aggregator's batch size
  const cidToProfile: Record<string, Profile> = {};
  const chunkSize = 100;
  for (let i = 0; i < uniqueCids.length; i += chunkSize) {
    const chunk = uniqueCids.slice(i, i + chunkSize);

    // Use SDK's RPC client to fetch profile batch
    let chunkProfiles;
    if (typeof sdk.rpc?.client?.call === 'function') {
      console.log('Using SDK rpc.client.call() for profile batch');
      const rawResult = await sdk.rpc.client.call(
        'circles_getProfileByCidBatch',
        [chunk]
      );
      // Validate results at runtime - filter out invalid profiles
      const validatedResults = Array.isArray(rawResult)
        ? validateProfileBatchResults(rawResult)
        : [];
      chunkProfiles = { result: validatedResults as Profile[] };
    } else {
      throw new Error('No RPC call method available');
    }
    // console.log(`newApiResults:`, newApiResults);

    const profilesMap = chunk.reduce(
      (p, c, i) => {
        p[c] = chunkProfiles.result[i];
        return p;
      },
      <Record<string, Profile>>{}
    );

    // const chunkProfiles = await sdk.profiles.getMany(chunk);
    for (const [cid, prof] of Object.entries(profilesMap)) {
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
 * configured with a 20ms wait time and batch size 100.
 */
const profileAggregator = new BatchAggregator<Address, Profile>({
  waitTimeMs: 20,
  maxBatchSize: 100,
  fetchFunction: fetchProfiles,
});

/**
 * Our main getProfile function:
 *   1. If it's one of the special-case addresses, return a static profile.
 *   2. Check the enriched profile cache from transaction history (already fetched).
 *   3. Check the local promise cache.
 *   4. Otherwise, aggregator.enqueue(address).
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

  // Check the local promise cache first
  const cached = profileCache.get(address);
  if (cached) {
    return cached;
  }

  // Check enriched profile cache from transaction history
  // This cache is populated when viewing transactions with profiles already included
  const enrichedProfile = getEnrichedProfile(address);
  if (enrichedProfile?.name) {
    const profile: Profile = {
      name: enrichedProfile.name,
      previewImageUrl: enrichedProfile.previewImageUrl,
    };
    // Store in cache as resolved promise
    const resolvedPromise = Promise.resolve(profile);
    profileCache.set(address, resolvedPromise);
    return profile;
  }

  // Not cached -> aggregator
  const profilePromise = profileAggregator.enqueue(address);

  // Store it in the cache so subsequent calls don't re-enqueue
  profileCache.set(address, profilePromise);

  return profilePromise;
}

export function profilesEqual(
  a: Profile | undefined,
  b: Profile | undefined
): boolean {
  if (!a || !b) {
    return false;
  }
  return (
    a.name === b.name &&
    a.description === b.description &&
    a.previewImageUrl === b.previewImageUrl &&
    a.imageUrl === b.imageUrl
  );
}

/**
 * Get cached avatar info for multiple addresses.
 * Returns only addresses that have been cached (from previous profile fetches).
 * This avoids redundant API calls when avatar info has already been fetched.
 */
export function getCachedAvatarInfo(addresses: Address[]): Record<Address, AvatarInfo | undefined> {
  const result: Record<Address, AvatarInfo | undefined> = {};
  for (const address of addresses) {
    const lower = address.toLowerCase() as Address;
    result[lower] = avatarInfoCache.get(lower);
  }
  return result;
}
