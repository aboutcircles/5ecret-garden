<script lang="ts">
  import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
  import { getProfile } from '$lib/shared/utils/profile';
  import { getTypeString } from '$lib/shared/utils/helpers';
  import HorizontalAvatarLayout from './HorizontalAvatarLayout.svelte';
  import VerticalAvatarLayout from './VerticalAvatarLayout.svelte';
  import { isVipProfileBookmark, profileBookmarksStore } from '$lib/areas/settings/state/profileBookmarks';
  import type { Address } from '@circles-sdk/utils';
  import type { AppProfileCore as Profile } from '$lib/shared/model/profile';
  import type { AvatarRow } from '@circles-sdk/data';
  import { fade } from 'svelte/transition';
  import { circles } from '$lib/shared/state/circles';
  import { normalizeEvmAddress } from '@circles-market/sdk';
  import { getAvatarInfoBatched } from '$lib/shared/data/circles/avatarInfoBatcher';

  const avatarInfoCache = new Map<string, Promise<AvatarRow | undefined>>();

  type AddressLike = Address | string | null | undefined;

  interface Props {
    address: AddressLike;
    profile?: Profile;
    avatarInfo?: AvatarRow;
    clickable?: boolean;
    view: 'horizontal' | 'horizontal_reverse' | 'vertical' | 'small' | 'small_no_text' | 'small_reverse';
    pictureOverlayUrl?: string | undefined;
    showBookmarkBadge?: boolean;
    topInfo?: string | undefined;
    bottomInfo?: string | undefined;
    showTypeInfo?: boolean;

    placeholderAvatar?: boolean;
    placeholderTop?: boolean;
    placeholderBottom?: boolean;
  }

  let {
    address,
    profile: profileProp,
    avatarInfo: avatarInfoProp,
    clickable = true,
    view,
    pictureOverlayUrl,
    showBookmarkBadge = false,
    topInfo,
    bottomInfo,
    showTypeInfo = false,

    placeholderAvatar = true,
    placeholderTop = true,
    placeholderBottom = true,
  }: Props = $props();

  const placeholderHasTopInfo = $derived(placeholderTop && !!topInfo);
  const placeholderHasBottomInfo = $derived(placeholderBottom && !!bottomInfo);

  const normalizedAddress = $derived.by((): Address | null => {
    if (address == null) return null;
    if (typeof address === 'string' && address.trim().length === 0) return null;
    try {
      return normalizeEvmAddress(String(address)) as Address;
    } catch (e) {
      console.debug('[avatar] failed to normalize address', { address }, e);
      return null;
    }
  });

  let profile: Profile | undefined = $state();
  let avatarInfo: AvatarRow | undefined = $state();

  const tooltipText = $derived(
    (profile?.name && profile.name.length > 0)
      ? profile.name
      : (normalizedAddress ?? 'Profile')
  );

  let requestId = 0;
  let avatarInfoRequestId = 0;

  $effect(() => {
    const addr = normalizedAddress;

    requestId += 1;
    const myReq = requestId;

    if (profileProp) {
      profile = profileProp;
      return;
    }

    if (!addr || !$circles) {
      profile = undefined;
      return;
    }

    profile = undefined;

    getProfile(addr)
      .then((p) => {
        if (myReq !== requestId) return;
        profile = p;
      })
      .catch((error) => {
        if (myReq !== requestId) return;
        console.error('Error getting profile for', addr, ':', error);
        profile = {
          name: addr.slice(0, 6) + '...' + addr.slice(-4),
          previewImageUrl: '/logo.svg',
        } as any;
      });
  });

  $effect(() => {
    const addr = normalizedAddress;
    avatarInfoRequestId += 1;
    const myReq = avatarInfoRequestId;

    if (avatarInfoProp) {
      avatarInfo = avatarInfoProp;
      return;
    }

    if (!showTypeInfo || !addr || !$circles) {
      avatarInfo = undefined;
      return;
    }

    const key = addr.toLowerCase();
    let promise = avatarInfoCache.get(key);
    if (!promise) {
      promise = getAvatarInfoBatched($circles, addr).catch((e) => {
        console.debug('[avatar] failed to load avatar info', { addr }, e);
        return undefined;
      });
      avatarInfoCache.set(key, promise);
    }

    promise
      .then((info) => {
        if (myReq !== avatarInfoRequestId) return;
        avatarInfo = info;
      })
      .catch(() => {
        if (myReq !== avatarInfoRequestId) return;
        avatarInfo = undefined;
      });
  });

  const typeLabel = $derived(
    showTypeInfo ? getTypeString(avatarInfo?.type ?? '') : undefined
  );

  const computedBottomInfo = $derived.by(() => {
    const normalizedType = typeLabel && typeLabel !== 'None' ? typeLabel : undefined;
    if (bottomInfo && normalizedType) {
      return `${normalizedType} • ${bottomInfo}`;
    }
    return normalizedType ?? bottomInfo;
  });

  const isVipBookmarked = $derived.by(() => {
    const addr = normalizedAddress?.toLowerCase();
    if (!addr) return false;
    return ($profileBookmarksStore ?? []).some(
      (bookmark) => bookmark.address === addr && isVipProfileBookmark(bookmark),
    );
  });

  const effectiveShowBookmarkBadge = $derived(showBookmarkBadge || isVipBookmarked);

  function openAvatar(e: MouseEvent) {
    if (!clickable) return;

    const addr = normalizedAddress;
    if (!addr) return;

    openProfilePopup(addr, { title: '' });

    e?.stopPropagation?.();
    e?.preventDefault?.();
  }
</script>

<!-- If no profile, show placeholders; otherwise fade in final layout. -->
{#if !profile}
    <!--
      Blank placeholders, keeping the same approximate width/height as
      the final layouts. This prevents layout shifting.
    -->
    {#if view === 'horizontal'}
        <div class="inline-flex items-center min-w-0 max-w-full">
            <div class="relative inline-block shrink-0">
                {#if placeholderAvatar}
                    <div class="w-10 h-10 rounded-full bg-transparent block">&nbsp;</div>
                {/if}
                {#if showBookmarkBadge}
                    <span
                        class="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-transparent"
                        aria-hidden="true"
                    >
                        &nbsp;
                    </span>
                {/if}
                {#if pictureOverlayUrl}
                    <span
                        class="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border border-base-100 bg-transparent"
                        aria-hidden="true"
                    ></span>
                {/if}
            </div>
            <div class="flex flex-col items-start pl-4 gap-y-0.5 min-w-0 w-full">
                {#if placeholderHasTopInfo}
                    <div class="text-xs">&nbsp;</div>
                {/if}
                <div class="font-semibold text-base-content">&nbsp;</div>
                {#if placeholderHasBottomInfo}
                    <div class="text-xs">&nbsp;</div>
                {/if}
            </div>
        </div>
    {:else if view === 'small' || view === 'small_no_text'}
        <div class="inline-flex items-center gap-2">
            {#if placeholderAvatar}
                <div class="w-6 h-6 rounded-full bg-transparent inline-block align-middle">&nbsp;</div>
            {/if}
            {#if view === 'small' && placeholderTop}
                <div class="text-sm font-medium inline-block align-middle">&nbsp;</div>
            {/if}
        </div>
    {:else if view === 'small_reverse'}
        <div class="inline-flex items-center gap-2">
            {#if placeholderTop}
                <div class="text-sm font-medium inline-block align-middle">&nbsp;</div>
            {/if}
            {#if placeholderAvatar}
                <div class="w-6 h-6 rounded-full bg-transparent inline-block align-middle">&nbsp;</div>
            {/if}
        </div>
    {:else}
        <div
                class="flex flex-col items-center gap-2 p-2 rounded-lg w-full"
                style="min-height: 6rem;"
        >
            {#if placeholderAvatar}
                <div class="w-12 h-12 rounded-full bg-transparent">&nbsp;</div>
            {/if}
            {#if placeholderTop}
                <div class="text-base font-semibold w-full text-center">&nbsp;</div>
            {/if}
            {#if placeholderBottom}
                <div class="text-sm opacity-75 w-full text-center">&nbsp;</div>
            {/if}
        </div>
    {/if}
{:else if view === 'horizontal'}
    <!-- Fade in the final layout once profile is loaded -->
    <div transition:fade title={tooltipText}>
        <HorizontalAvatarLayout
                {pictureOverlayUrl}
                showBookmarkBadge={effectiveShowBookmarkBadge}
                onclick={openAvatar}
                {profile}
                {topInfo}
                bottomInfo={computedBottomInfo}
        />
    </div>
{:else if view === 'small' || view === 'small_no_text'}
    <div class="inline-flex items-center gap-2" transition:fade>
        <button
            class="cursor-pointer inline-flex items-center"
            onclick={openAvatar}
            aria-label={tooltipText}
            title={tooltipText}
        >
            <span class="relative inline-flex">
                <img
                    src={profile?.previewImageUrl}
                    alt="User Icon"
                    class="w-6 h-6 object-cover rounded-full"
                />
                {#if effectiveShowBookmarkBadge}
                    <span
                        class="absolute -top-1 -right-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-warning text-warning-content text-[9px] leading-none font-bold border border-base-100"
                        aria-label="Bookmarked"
                        title="Bookmarked"
                    >
                        ★
                    </span>
                {/if}
            </span>
        </button>
        {#if view === 'small'}
            <span class="text-sm font-medium truncate max-w-[12rem] align-middle">{profile?.name}</span>
        {/if}
    </div>
{:else if view === 'small_reverse'}
    <div class="inline-flex items-center gap-2" transition:fade>
        <span class="text-sm font-medium truncate max-w-[12rem] align-middle text-right">{profile?.name}</span>
        <button
            class="cursor-pointer inline-flex items-center"
            onclick={openAvatar}
            aria-label={tooltipText}
            title={tooltipText}
        >
            <span class="relative inline-flex">
                <img
                    src={profile?.previewImageUrl}
                    alt="User Icon"
                    class="w-6 h-6 object-cover rounded-full"
                />
                {#if effectiveShowBookmarkBadge}
                    <span
                        class="absolute -top-1 -right-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-warning text-warning-content text-[9px] leading-none font-bold border border-base-100"
                        aria-label="Bookmarked"
                        title="Bookmarked"
                    >
                        ★
                    </span>
                {/if}
            </span>
        </button>
    </div>
{:else}
    <div transition:fade title={tooltipText}>
        <VerticalAvatarLayout
                onclick={openAvatar}
                {profile}
                showBookmarkBadge={effectiveShowBookmarkBadge}
        />
    </div>
{/if}

