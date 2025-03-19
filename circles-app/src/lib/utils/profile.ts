import type { Profile } from '@circles-sdk/profiles';
import { get } from 'svelte/store';
import { circles } from '$lib/stores/circles';
import type { AvatarRow } from '@circles-sdk/data';
import { shortenAddress } from '$lib/utils/shared';

const profileCache = new Map<string, Promise<Profile>>();

export function addProfile(address: string, profile: Promise<Profile>) {
  profileCache.set(address, profile);
}

export function removeProfileFromCache(address: string) {
  profileCache.delete(address);
}

function setFallbackValues(
  address: string,
  avatar: AvatarRow | undefined,
  profile: Profile | undefined
): Profile {
  const fallbackProfile: Profile = {
    name: shortenAddress(address),
    previewImageUrl: '/logo.svg',
  };

  if (
    avatar?.type === 'CrcV2_RegisterHuman' ||
    avatar?.type === 'CrcV1_Signup'
  ) {
    fallbackProfile.previewImageUrl = '/person.svg';
  }
  if (avatar?.type === 'CrcV2_RegisterGroup') {
    fallbackProfile.previewImageUrl = '/group.svg';
  }
  if (avatar?.type === 'CrcV2_RegisterOrganization') {
    fallbackProfile.previewImageUrl = '/organization.svg';
  }

  if (avatar?.name) {
    fallbackProfile.name = avatar.name;
  }

  if (!profile) {
    return fallbackProfile;
  }

  if ((profile?.name?.trim() ?? '') === '') {
    profile.name = fallbackProfile.name;
  }

  if (!profile.previewImageUrl || profile.previewImageUrl.trim() === '') {
    profile.previewImageUrl = fallbackProfile.previewImageUrl;
  }

  return profile;
}

export async function getProfile(address: `0x${string}`): Promise<Profile> {
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
  if (address === "0x9944Ce8e27CE1f16C4003f108b1C09e5Ae011bA0".toLowerCase()) {
    return {
      name: 'Circles Relayer Fee',
      previewImageUrl: '/logo.svg',
    };
  }
  if (profileCache.has(address)) {
    return profileCache.get(address)!;
  }

  const profilePromise = new Promise<Profile>(async (resolve) => {
    const sdk = get(circles);
    if (!sdk) {
      throw new Error('sdk is required');
    }

    let avatar = await sdk?.data.getAvatarInfo(address);
    let profile: Profile | undefined = undefined;

    if (avatar?.version === 2 && avatar.cidV0) {
      profile = await sdk.profiles?.get(avatar.cidV0);
    }

    profile = setFallbackValues(address, avatar, profile);
    resolve(profile);
  });

  addProfile(address, profilePromise);

  return profilePromise;
}
