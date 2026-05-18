<script lang="ts">
  import ProfilePage from '$lib/areas/profile/ui/pages/Profile.svelte';
  import { getProfile, getResolvedProfile } from '$lib/shared/utils/profile';
  import HorizontalAvatarLayout from './HorizontalAvatarLayout.svelte';
  import VerticalAvatarLayout from './VerticalAvatarLayout.svelte';
  import {
    popupControls,
    type PopupContentDefinition,
  } from '$lib/shared/state/popup/popUp.svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import type { Profile } from '@aboutcircles/sdk-types';
  import { circles } from '$lib/shared/state/circles';

  type AvatarView = 'horizontal' | 'vertical' | 'small' | 'small_no_text' | 'small_reverse';

  interface Props {
    address: Address | undefined;
    clickable?: boolean;
    view: AvatarView;
    pictureOverlayUrl?: string | undefined;
    topInfo?: string | undefined;
    bottomInfo?: string | undefined;

    /** Show avatar type badge (human/group/org). Currently reserved for future use. */
    showTypeInfo?: boolean;

    /**
     * Pre-fetched profile. When provided, Avatar renders this directly and
     * skips its own getProfile() fetch. Callers that already batch-load
     * profiles (e.g. the contacts list) should pass it through so each row
     * doesn't queue an independent network request.
     */
    profile?: Profile | undefined;

    /**
     * Control whether to show placeholders for each position
     * so the layout doesn't shift if you sometimes use them.
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
    showTypeInfo = false,
    profile: providedProfile,

    // Default placeholders to true
    placeholderAvatar = true,
    placeholderTop = true,
    placeholderBottom = true,
  }: Props = $props();

  // Map compact view modes to horizontal layout with reduced placeholders
  const effectiveView: 'horizontal' | 'vertical' = $derived(
    view === 'small' || view === 'small_no_text' || view === 'small_reverse' ? 'horizontal' as const : view as 'horizontal' | 'vertical'
  );

  // Seed from the sync resolved-profile cache so a remount (e.g. a virtualized
  // row scrolling back into range) doesn't flash a loading skeleton for a
  // profile we already know.
  let fetchedProfile: Profile | undefined = $state(
    address ? getResolvedProfile(address) : undefined
  );
  let lastFetchedAddress: string | undefined = $state(
    fetchedProfile && address ? address : undefined
  );

  // Prefer a profile passed in by the parent (e.g. the contacts list, which
  // already batch-fetched profiles) over the locally-fetched one. Falling back
  // to the parent-provided profile when our own fetch hasn't resolved yet
  // avoids the per-row queue + skeleton flash that made large lists flicker.
  const profile = $derived(providedProfile ?? fetchedProfile);

  // Derive SDK availability for proper reactive tracking
  let sdk = $derived($circles);

  $effect(() => {
    // If the parent already gave us a profile, skip the internal fetch entirely.
    if (providedProfile) return;

    // Reset profile when address changes — but prefer the sync cache so we
    // don't flash a skeleton when the new address is already known.
    if (address !== lastFetchedAddress) {
      fetchedProfile = address ? getResolvedProfile(address) : undefined;
    }

    if (!address || !sdk) return;

    // Skip if we already fetched for this address
    if (address === lastFetchedAddress && fetchedProfile) return;

    lastFetchedAddress = address;

    getProfile(address as `0x${string}`)
      .then((newProfile) => {
        // Only update if address hasn't changed during fetch
        if (address === lastFetchedAddress) {
          fetchedProfile = newProfile;
        }
      })
      .catch(() => {
        if (address === lastFetchedAddress) {
          fetchedProfile = {
            name: address ? (address.slice(0, 6) + '...' + address.slice(-4)) : 'Unknown',
            previewImageUrl: '/logo.svg',
          };
          // Allow retry on next render (e.g., when SDK becomes available)
          lastFetchedAddress = undefined;
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

<!-- If no profile, show skeleton loading; otherwise render the final layout.
     No fade transition: in virtualized lists, rows scroll in and out of the
     render range frequently, and a fade-in animation on every re-mount looks
     like the list is flickering. -->
{#if !profile}
  {#if effectiveView === 'horizontal'}
    <div
      class="flex items-center gap-3 py-1 rounded-lg w-full animate-pulse"
      style="min-height: 48px;"
    >
      {#if placeholderAvatar}
        <div class="w-10 h-10 rounded-full bg-base-300/70 shrink-0"></div>
      {/if}

      <div class="flex flex-col justify-center gap-1.5 min-w-0">
        {#if placeholderTop}
          <div class="h-4 w-28 bg-base-300/70 rounded"></div>
        {/if}
        {#if placeholderBottom}
          <div class="h-3 w-20 bg-base-300/70 rounded"></div>
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
{:else if effectiveView === 'horizontal'}
  <HorizontalAvatarLayout
    {pictureOverlayUrl}
    onclick={openAvatar}
    {profile}
    {topInfo}
    {bottomInfo}
  />
{:else}
  <VerticalAvatarLayout onclick={openAvatar} {profile} />
{/if}
