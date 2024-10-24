<script lang="ts" context="module">
  import type { Profile } from '@circles-sdk/profiles';
  import { get } from 'svelte/store';
  import { circles } from '$lib/stores/circles';
  import type { AvatarRow } from '@circles-sdk/data';
  import { shortenAddress } from '$lib/utils/shared';
  import { ethers } from 'ethers';

  const profileCache = new Map<string, Promise<Profile>>();

  function addProfile(address: string, profile: Promise<Profile>) {
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

  export type CirclesSafeMap = { [safeAddress: string]: Profile };
  export const CirclesGardenApi = `https://api.circles.garden/`;

  async function queryCirclesGarden(
    safeAddresses: string[]
  ): Promise<CirclesSafeMap> {
    const safeAddressCopy = JSON.parse(JSON.stringify(safeAddresses));
    const batches: string[][] = [];

    while (safeAddressCopy.length) {
      batches.push(safeAddressCopy.splice(0, 50));
    }

    const circlesSafeMap: CirclesSafeMap = {};

    if (batches.length == 0) {
      return circlesSafeMap;
    }

    for (let batch of batches) {
      const query = batch.reduce(
        (p, c) => p + `address[]=${ethers.getAddress(c)}&`,
        ''
      );
      const requestUrl = `${CirclesGardenApi}api/users/?${query}`;

      const requestResult = await fetch(requestUrl);
      const requestResultJson = await requestResult.json();

      const profiles: (Profile & { safeAddress: string })[] =
        requestResultJson.data.map((o: any) => {
          return <Profile & { safeAddress: string }>{
            name: o.username,
            previewImageUrl: o.avatarUrl,
            safeAddress: o.safeAddress.toLowerCase(),
          };
        }) ?? [];

      profiles.forEach((o) => {
        if (!o.safeAddress) return;
        circlesSafeMap[o.safeAddress] = o;
      }, circlesSafeMap);
    }

    return circlesSafeMap;
  }

  // Implementing the batching mechanism
  const getProfileQueue: {
    address: string;
    resolve: (data: Profile | undefined) => void;
  }[] = [];

  setInterval(async () => {
    if (getProfileQueue.length === 0) {
      return;
    }

    const queueCopy = getProfileQueue.slice();
    const profilesToQuery = queueCopy.map((o) => o.address);
    getProfileQueue.splice(0, getProfileQueue.length); // Clear the queue

    try {
      const circlesGardenResults = await queryCirclesGarden(profilesToQuery);

      queueCopy.forEach((o) => {
        const profile = circlesGardenResults[o.address] ?? {};
        o.resolve(profile);
      });
    } catch (error) {
      // Handle errors if needed
      queueCopy.forEach((o) => {
        o.resolve(undefined); // You can modify this to reject or handle errors differently
      });
    }
  }, 20);

  export async function getProfile(address: string): Promise<Profile> {
    if (address === '0x0000000000000000000000000000000000000001') {
      return {
        name: 'Transitive transfer',
        previewImageUrl: '/logo.svg',
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
      if (avatar?.version === 1) {
        // Use the batching mechanism
        let resolveFunction: ((data: Profile | undefined) => void) | undefined =
          undefined;
        const profilePromise = new Promise<Profile | undefined>(
          (resolve) => (resolveFunction = resolve)
        );

        if (!resolveFunction) {
          throw new Error('resolveFunction is required');
        }

        getProfileQueue.push({ address: address, resolve: resolveFunction });
        profile = await profilePromise;
      }

      profile = setFallbackValues(address, avatar, profile);
      resolve(profile);
    });

    addProfile(address, profilePromise);

    return profilePromise;
  }
</script>

<script lang="ts">
  import HorizontalAvatarLayout from '$lib/components/avatar/HorizontalAvatarLayout.svelte';
  import VerticalAvatarLayout from '$lib/components/avatar/VerticalAvatarLayout.svelte';
  import VerticalSmallAvatarLayout from '$lib/components/avatar/VerticalSmallAvatarLayout.svelte';
  import type {
    PopupContentApi,
    PopupContentDefinition,
  } from '$lib/components/PopUp.svelte';
  import ProfilePage from '$lib/pages/Profile.svelte';
  import { popupControls } from '$lib/components/PopUp.svelte';

  export let address: string;
  export let clickable: boolean = true;
  export let view: 'horizontal' | 'vertical' | 'vertical_small' = 'horizontal';
  export let imageStyle: 'square' | 'circle' = 'circle';
  export let showName: boolean = true;
  export let contentApi: PopupContentApi | undefined = undefined;
  export let pictureOverlayUrl: string | undefined = undefined;
  export let trustVersion: number | undefined = undefined;

  let profile: Profile | undefined;

  $: {
    if (address) {
      initialize();
    }
  }

  function openAvatar() {
    if (!clickable) {
      return;
    }
    const nextPage: PopupContentDefinition = {
      title: shortenAddress(address),
      component: ProfilePage,
      props: {
        address: address,
      },
    };
    if (contentApi) {
      contentApi.open(nextPage);
    } else {
      $popupControls.open?.(nextPage);
    }
  }

  async function initialize() {
    profile = await getProfile(address);
  }
</script>

{#if !profile}
  <div class="inline-flex items-center space-x-2">
    <img
      src={'/sparkles.svg'}
      alt="Loading user Icon"
      class="w-8 h-8 rounded-full"
    />
    <span>...</span>
  </div>
{:else if view === 'vertical'}
  <VerticalAvatarLayout
    {showName}
    {imageStyle}
    {pictureOverlayUrl}
    on:click={openAvatar}
    {profile}
    {trustVersion}
  >
    <slot></slot>
  </VerticalAvatarLayout>
{:else if view === 'vertical_small'}
  <VerticalSmallAvatarLayout
    {showName}
    {imageStyle}
    {pictureOverlayUrl}
    on:click={openAvatar}
    {profile}
    {trustVersion}
  >
    <slot></slot>
  </VerticalSmallAvatarLayout>
{:else}
  <HorizontalAvatarLayout
    {showName}
    {imageStyle}
    {pictureOverlayUrl}
    on:click={openAvatar}
    {profile}
    {trustVersion}
  >
    <slot></slot>
  </HorizontalAvatarLayout>
{/if}
