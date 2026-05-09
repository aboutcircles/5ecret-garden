<script lang="ts">
  import type { AppProfileCore as Profile } from '$lib/shared/model/profile';
  import Markdown from '$lib/shared/ui/content/markdown/Markdown.svelte';
  import { T } from '$lib/design-system/tokens.js';

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

<div style="width:100%;display:flex;flex-direction:column;align-items:center;text-align:center;">
  <button style="cursor:pointer;background:none;border:0;padding:0;" {onclick}>
    <span style="position:relative;display:inline-flex;">
      {#if imgUrl && !imgError}
        <img
          src={imgUrl}
          alt={profile?.name ?? 'Profile avatar'}
          style="width:80px;height:80px;object-fit:cover;border-radius:9999px;"
          onerror={onImgError}
        />
      {:else}
        <img src="/logo.svg" alt="Fallback" style="width:80px;height:80px;object-fit:cover;border-radius:9999px;" />
      {/if}

      {#if showBookmarkBadge}
        <span
          style="position:absolute;top:-4px;right:-4px;display:inline-flex;width:20px;height:20px;align-items:center;justify-content:center;border-radius:9999px;background:{T.warning};color:{T.surface};font-size:11px;line-height:1;font-weight:700;border:1px solid {T.surface};"
          aria-label="Bookmarked"
          title="Bookmarked"
        >
          ★
        </span>
      {/if}
    </span>
  </button>
  <div style="display:flex;flex-direction:column;align-items:center;padding:16px;gap:2px;">
    <span style="font-weight:600;color:{T.ink};">{profile?.name}</span>
    {#if profile?.description}
      <Markdown content={profile.description} style="font-size:13px;line-height:1.6;color:{T.inkMuted};max-width:none;margin-top:0;" />
    {/if}
  </div>
</div>
