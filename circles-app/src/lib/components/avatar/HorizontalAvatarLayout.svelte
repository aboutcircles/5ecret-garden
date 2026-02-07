<script lang="ts">
  import type { AppProfileCore as Profile } from '$lib/profiles';

  interface Props {
    profile: Profile | undefined;
    pictureOverlayUrl?: string | undefined;
    showBookmarkBadge?: boolean;
    topInfo?: string | undefined;
    bottomInfo?: string | undefined;
    onclick?: (e: MouseEvent) => void | undefined;
  }

  let {
    profile,
    pictureOverlayUrl = undefined,
    showBookmarkBadge = false,
    topInfo = undefined,
    bottomInfo = undefined,
    onclick = undefined,
  }: Props = $props();

  let imgError: boolean = $state(false);
  const imgUrl = $derived(profile?.previewImageUrl || '');
  function onImgError() { imgError = true; }
  // Reset image error when profile/image changes
  $effect(() => { imgUrl; imgError = false; });
</script>

<div class="inline-flex items-center min-w-0 max-w-full">
  <button class="cursor-pointer shrink-0" {onclick}>
      <div class="relative inline-block">
        {#if imgUrl && !imgError}
          <img
            src={imgUrl}
            alt={profile?.name ?? 'Profile avatar'}
            class="w-10 h-10 object-cover rounded-full"
            onerror={onImgError}
          />
        {:else}
          <img src="/logo.svg" alt="Fallback" class="w-10 h-10 object-cover rounded-full" />
        {/if}

        {#if showBookmarkBadge}
          <span
            class="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-warning text-warning-content text-[10px] leading-none font-bold border border-base-100"
            aria-label="Bookmarked"
            title="Bookmarked"
          >
            ★
          </span>
        {/if}

        {#if pictureOverlayUrl}
        <img
          src={pictureOverlayUrl}
          alt="Overlay"
          class="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border border-base-100 bg-base-100"
        />
      {/if}
    </div>
  </button>
  <div class="flex flex-col items-start pl-4 gap-y-0.5 min-w-0">
    {#if topInfo}
      <p class="text-xs text-base-content/70 truncate w-full">
        {topInfo}
      </p>
    {/if}
    <span class="font-semibold text-base-content truncate w-full">{profile?.name}</span>
    {#if bottomInfo}
      <p class="text-xs text-base-content/70 truncate w-full">
        {bottomInfo}
      </p>
    {/if}
  </div>
</div>
