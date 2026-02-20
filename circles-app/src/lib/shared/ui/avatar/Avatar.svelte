<script lang="ts">
  import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
  import { getProfile } from '$lib/shared/utils/profile';
  import { getTypeString } from '$lib/shared/utils/helpers';
  import HorizontalAvatarLayout from './HorizontalAvatarLayout.svelte';
  import VerticalAvatarLayout from './VerticalAvatarLayout.svelte';
  import AvatarSkeletonHorizontal from './AvatarSkeletonHorizontal.svelte';
  import AvatarSkeletonSmall from './AvatarSkeletonSmall.svelte';
  import AvatarSkeletonVertical from './AvatarSkeletonVertical.svelte';
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
    {#if view === 'horizontal' || view === 'horizontal_reverse'}
        <AvatarSkeletonHorizontal
            reverse={view === 'horizontal_reverse'}
            showAvatar={placeholderAvatar}
            showTop={placeholderHasTopInfo}
            showBottom={placeholderHasBottomInfo}
            showBookmarkBadge={effectiveShowBookmarkBadge}
            showOverlay={!!pictureOverlayUrl}
        />
    {:else if view === 'small' || view === 'small_no_text'}
        <AvatarSkeletonSmall
            showAvatar={placeholderAvatar}
            showText={view === 'small' && placeholderTop}
        />
    {:else if view === 'small_reverse'}
        <AvatarSkeletonSmall
            reverse={true}
            showAvatar={placeholderAvatar}
            showText={placeholderTop}
        />
    {:else}
        <AvatarSkeletonVertical
            showAvatar={placeholderAvatar}
            showTop={placeholderTop}
            showBottom={placeholderBottom}
            showBookmarkBadge={effectiveShowBookmarkBadge}
        />
    {/if}
{:else if view === 'horizontal' || view === 'horizontal_reverse'}
    <!-- Fade in the final layout once profile is loaded -->
    <div transition:fade title={tooltipText}>
        <HorizontalAvatarLayout
                {pictureOverlayUrl}
                showBookmarkBadge={effectiveShowBookmarkBadge}
                reverse={view === 'horizontal_reverse'}
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

