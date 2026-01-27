<script lang="ts">
  import ProfilePage from '$lib/pages/Profile.svelte';
  import { getProfile } from '$lib/utils/profile';
  import HorizontalAvatarLayout from './HorizontalAvatarLayout.svelte';
  import VerticalAvatarLayout from './VerticalAvatarLayout.svelte';
  import {
    popupControls,
    type PopupContentDefinition,
  } from '$lib/stores/popUp.svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import type { Profile } from '@aboutcircles/sdk-types';
  import { fade } from 'svelte/transition';
  import { circles } from '$lib/stores/circles';

  interface Props {
    address: Address | undefined;
    clickable?: boolean;
    view: 'horizontal' | 'vertical';
    pictureOverlayUrl?: string | undefined;
    topInfo?: string | undefined;
    bottomInfo?: string | undefined;

    /**
     * Control whether to show placeholders for each position
     * so the layout doesn’t shift if you sometimes use them.
     */
    placeholderAvatar?: boolean;
    placeholderTop?: boolean;
    placeholderBottom?: boolean;
  }

  let {
    address,
    clickable = true,
    view,
    pictureOverlayUrl,
    topInfo,
    bottomInfo,

    // Default placeholders to true
    placeholderAvatar = true,
    placeholderTop = true,
    placeholderBottom = true,
  }: Props = $props();

  let profile: Profile | undefined = $state();
  let lastFetchedAddress: string | undefined = $state();

  // Derive SDK availability for proper reactive tracking
  let sdk = $derived($circles);

  $effect(() => {
    // Reset profile when address changes to show loading skeleton
    if (address !== lastFetchedAddress) {
      profile = undefined;
    }

    if (!address || !sdk) return;

    // Skip if we already fetched for this address
    if (address === lastFetchedAddress && profile) return;

    lastFetchedAddress = address;

    getProfile(address)
      .then((newProfile) => {
        // Only update if address hasn't changed during fetch
        if (address === lastFetchedAddress) {
          profile = newProfile;
        }
      })
      .catch((error) => {
        console.error('Error getting profile for', address, ':', error);
        if (address === lastFetchedAddress) {
          profile = {
            name: address.slice(0, 6) + '...' + address.slice(-4),
            previewImageUrl: '/logo.svg',
          };
        }
      });
  });

  function openAvatar(e: MouseEvent) {
    if (!clickable) return;

    const nextPage: PopupContentDefinition = {
      title: '',
      component: ProfilePage,
      props: { address },
    };
    popupControls.open(nextPage);

    e?.preventDefault();
  }
</script>

<!-- If no profile, show skeleton loading; otherwise fade in final layout. -->
{#if !profile}
  {#if view === 'horizontal'}
    <div
      class="flex items-center gap-2 p-2 rounded-lg w-full animate-pulse"
      style="min-height: 3rem;"
    >
      {#if placeholderAvatar}
        <div class="w-8 h-8 rounded-full bg-base-300 shrink-0"></div>
      {/if}

      <div class="flex flex-col justify-center gap-1 min-w-0">
        {#if placeholderTop}
          <div class="h-4 w-24 bg-base-300 rounded"></div>
        {/if}
        {#if placeholderBottom}
          <div class="h-3 w-16 bg-base-300 rounded"></div>
        {/if}
      </div>
    </div>
  {:else}
    <div
      class="flex flex-col items-center gap-2 p-2 rounded-lg w-full animate-pulse"
      style="min-height: 6rem;"
    >
      {#if placeholderAvatar}
        <div class="w-12 h-12 rounded-full bg-base-300"></div>
      {/if}
      {#if placeholderTop}
        <div class="h-4 w-20 bg-base-300 rounded"></div>
      {/if}
      {#if placeholderBottom}
        <div class="h-3 w-14 bg-base-300 rounded"></div>
      {/if}
    </div>
  {/if}
{:else if view === 'horizontal'}
  <!-- Fade in the final layout once profile is loaded -->
  <div transition:fade>
    <HorizontalAvatarLayout
      {pictureOverlayUrl}
      onclick={openAvatar}
      {profile}
      {topInfo}
      {bottomInfo}
    />
  </div>
{:else}
  <div transition:fade>
    <VerticalAvatarLayout onclick={openAvatar} {profile} />
  </div>
{/if}
