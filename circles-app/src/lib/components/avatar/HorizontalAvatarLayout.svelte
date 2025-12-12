<script lang="ts">
  import type { Profile } from '@circles-sdk/profiles';

  interface Props {
    profile: Profile | undefined;
    pictureOverlayUrl?: string | undefined;
    topInfo?: string | undefined;
    bottomInfo?: string | undefined;
    onclick?: (e: MouseEvent) => void | undefined;
  }

  let {
    profile,
    pictureOverlayUrl = undefined,
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
    {#if pictureOverlayUrl}
      <div class="indicator">
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
        <img
          src={pictureOverlayUrl}
          alt="Overlay"
          class="indicator-item indicator-bottom h-5 w-5 rounded-full border border-base-100 translate-y-[8%] translate-x-[10%] bg-base-100"
        />
      </div>
    {:else}
      {#if imgUrl && !imgError}
        <img
          src={imgUrl}
          alt="User Icon"
          class="w-10 h-10 object-cover rounded-full"
          onerror={onImgError}
        />
      {:else}
        <img src="/logo.svg" alt="Fallback" class="w-10 h-10 object-cover rounded-full" />
      {/if}
    {/if}
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
