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
  import HorizontalAvatarLayout from '$lib/components/Avatar/HorizontalAvatarLayout.svelte';
  // import VerticalAvatarLayout from '$lib/components/avatar_/VerticalAvatarLayout.svelte';
  import type {
    PopupContentApi,
    PopupContentDefinition,
  } from '$lib/components/PopUp.svelte';
  import ProfilePage from '$lib/pages/Profile.svelte';
  import { popupControls } from '$lib/components/PopUp.svelte';
  // import TransactionRowAvatarLayout from './avatar_/TransactionRowAvatarLayout.svelte';
  // import HorizontalSmallAvatarLayout from './avatar_/HorizontalSmallAvatarLayout.svelte';
  import { getProfile } from '$lib/utils/profile';

  export let address: string;
  export let clickable: boolean = true;
  export let view:
    | 'horizontal'
    | 'vertical'
  export let contentApi: PopupContentApi | undefined = undefined;
  export let pictureOverlayUrl: string | undefined = undefined;
  export let topInfo: string | undefined = undefined;
  export let bottomInfo: string | undefined = undefined;
  // export let trustVersion: number | undefined = undefined;
  // export let date: number = 0;

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
  <HorizontalAvatarLayout
    {pictureOverlayUrl}
    on:click={openAvatar}
    {profile}
    {topInfo}
    {bottomInfo}
  />
{/if}
  <!-- <VerticalAvatarLayout
    on:click={openAvatar}
    {profile}
    {trustVersion}
  >
    <slot></slot>
  </VerticalAvatarLayout> -->
<!-- {:else if view === 'transaction_row'}
  <TransactionRowAvatarLayout
    {pictureOverlayUrl}
    on:click={openAvatar}
    {profile}
    {date}
  >
    <slot></slot>
  </TransactionRowAvatarLayout>
  {:else if view === 'horizontal_small'}
  <HorizontalSmallAvatarLayout
    on:click={openAvatar}
    {profile}
  >
    <slot></slot>
  </HorizontalSmallAvatarLayout> -->
<!-- {:else}
  <HorizontalAvatarLayout
    {pictureOverlayUrl}
    on:click={openAvatar}
    {profile}
    {trustVersion}
  >
    <slot></slot>
  </HorizontalAvatarLayout> -->
<!-- {/if} -->
