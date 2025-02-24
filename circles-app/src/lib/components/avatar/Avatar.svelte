<script lang="ts" context="module">
  import type { Profile } from '@circles-sdk/profiles';
  import { shortenAddress } from '$lib/utils/shared';
  import { ethers } from 'ethers';

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
</script>

<script lang="ts">
  import ProfilePage from '$lib/pages/Profile.svelte';
  import { getProfile } from '$lib/utils/profile';
  import { onMount, type SvelteComponent } from 'svelte';
  import HorizontalAvatarLayout from './HorizontalAvatarLayout.svelte';
  import VerticalAvatarLayout from './VerticalAvatarLayout.svelte';
  import {
    popupControls,
    type PopupContentDefinition,
  } from '$lib/stores/popUp';

  export let address: string;
  export let clickable: boolean = true;
  export let view: 'horizontal' | 'vertical';
  export let pictureOverlayUrl: string | undefined = undefined;
  export let topInfo: string[] | undefined = undefined;
  export let bottomInfo: string | undefined = undefined;

  let profile: Profile | undefined;

  onMount(async () => {
    //TODO: if we pass a profile directly, we don't have to initialize and call getProfile() from sdk
    if (address) {
      profile = await getProfile(address);
    }
  });

  function openAvatar() {
    if (!clickable) {
      return;
    }
    const nextPage: PopupContentDefinition = {
      title: shortenAddress(address),
      component: ProfilePage as typeof SvelteComponent,
      props: {
        address: address,
      },
    };
    console.log('Opening avatar:', nextPage);
    popupControls.open(nextPage);
  }
</script>

{#if !profile}
  <div class="inline-flex items-center space-x-2">
    <img
      src={'/person.svg'}
      alt="Loading user Icon"
      class="w-8 h-8 rounded-full"
    />
    <span>...</span>
  </div>
{:else if view === 'horizontal'}
  <HorizontalAvatarLayout
    {pictureOverlayUrl}
    on:click={openAvatar}
    {profile}
    {topInfo}
    {bottomInfo}
  />
{:else}
  <VerticalAvatarLayout on:click={openAvatar} {profile} />
{/if}
