<script lang="ts">
  import type { AppProfileCore as Profile } from '$lib/shared/model/profile';
  import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';

  interface Props {
    profile: Profile | undefined;
    showBookmarkBadge?: boolean;
    onclick?: (e: MouseEvent) => void | undefined;
  }

  let { profile, showBookmarkBadge = false, onclick }: Props = $props();

  let imgError: boolean = $state(false);
  const imgUrl = $derived(profile?.previewImageUrl || '');
  function onImgError() { imgError = true; }
  // Reset image error when profile/image changes
  $effect(() => { imgUrl; imgError = false; });
</script>

<div class="w-full flex flex-col items-center text-center">
  <button class="cursor-pointer" {onclick}>
    <span class="relative inline-flex">
      {#if imgUrl && !imgError}
        <img
          src={imgUrl}
          alt={profile?.name ?? 'Profile avatar'}
          class="w-20 h-20 object-cover rounded-full"
          onerror={onImgError}
        />
      {:else}
        <img src="/logo.svg" alt="Fallback" class="w-20 h-20 object-cover rounded-full" />
      {/if}

      {#if showBookmarkBadge}
        <span
          class="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-warning text-warning-content text-[11px] leading-none font-bold border border-base-100"
          aria-label="Bookmarked"
          title="Bookmarked"
        >
          ★
        </span>
      {/if}
    </span>
  </button>
  <div class="flex flex-col items-center p-4 gap-y-0.5">
    <span class="font-semibold text-base-content">{profile?.name}</span>
    {#if profile?.description}
      <Markdown content={profile.description} class="prose prose-sm max-w-none text-base-content/70 mt-0" />
    {/if}
  </div>
</div>
