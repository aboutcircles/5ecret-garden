<script lang="ts">
  import type { AppProfileCore as Profile } from '$lib/shared/model/profile';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    profile: Profile | undefined;
    pictureOverlayUrl?: string | undefined;
    showBookmarkBadge?: boolean;
    reverse?: boolean;
    topInfo?: string | undefined;
    bottomInfo?: string | undefined;
    onclick?: (e: MouseEvent) => void | undefined;
  }

  let {
    profile,
    pictureOverlayUrl = undefined,
    showBookmarkBadge = false,
    reverse = false,
    topInfo = undefined,
    bottomInfo = undefined,
    onclick = undefined,
  }: Props = $props();

  let imgError: boolean = $state(false);
  const imgUrl = $derived(profile?.previewImageUrl || '');
  function onImgError() { imgError = true; }
  $effect(() => { imgUrl; imgError = false; });
</script>

<div style={`display:inline-flex;align-items:center;min-width:0;max-width:100%;${reverse ? 'flex-direction:row-reverse;' : ''}`}>
  <button class="avatar-img-btn" style="cursor:pointer;flex-shrink:0;background:none;border:0;padding:0;" {onclick}>
    <div style="position:relative;display:inline-block;">
      {#if imgUrl && !imgError}
        <img
          class="avatar-photo"
          src={imgUrl}
          alt={profile?.name ?? 'Profile avatar'}
          style="width:40px;height:40px;object-fit:cover;border-radius:9999px;display:block;"
          onerror={onImgError}
        />
      {:else}
        <img
          class="avatar-photo"
          src="/logo.svg"
          alt="Fallback"
          style="width:40px;height:40px;object-fit:cover;border-radius:9999px;display:block;"
        />
      {/if}

      {#if showBookmarkBadge}
        <span
          style="position:absolute;top:-4px;right:-4px;display:inline-flex;width:16px;height:16px;align-items:center;justify-content:center;border-radius:9999px;background:{T.warning};color:{T.surface};font-size:10px;line-height:1;font-weight:700;border:1px solid {T.surface};"
          aria-label="Bookmarked"
          title="Bookmarked"
        >★</span>
      {/if}

      {#if pictureOverlayUrl}
        <img
          src={pictureOverlayUrl}
          alt="Overlay"
          style="position:absolute;bottom:-4px;right:-4px;width:20px;height:20px;border-radius:9999px;border:1px solid {T.surface};background:{T.surface};display:block;"
        />
      {/if}
    </div>
  </button>
  <div style={`display:flex;flex-direction:column;gap:2px;min-width:0;${reverse ? 'align-items:flex-end;padding-right:16px;text-align:right;' : 'align-items:flex-start;padding-left:16px;'}`}>
    {#if topInfo}
      <p style="font-size:12px;color:{T.inkMuted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;margin:0;">
        {topInfo}
      </p>
    {/if}
    <span style="font-weight:600;color:{T.ink};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;">{profile?.name}</span>
    {#if bottomInfo}
      <p style="font-size:12px;color:{T.inkMuted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;margin:0;">
        {bottomInfo}
      </p>
    {/if}
  </div>
</div>

<style>
  /* No bounce or lift — block the global rule on the wrapper button */
  .avatar-img-btn { outline: none; }
  .avatar-img-btn:hover,
  .avatar-img-btn:focus-visible {
    transform: none !important;
    box-shadow: none !important;
    filter: none !important;
  }

  /*
   * Ring applied directly to the circular <img> so it's always a perfect circle.
   * Pattern: image → 2px white gap → 2px purple ring.
   * box-shadow respects border-radius:9999px on the img element.
   */
  .avatar-photo {
    transition: box-shadow 200ms ease-out, transform 200ms ease-out;
  }
  .avatar-img-btn:hover .avatar-photo,
  .avatar-img-btn:focus-visible .avatar-photo {
    box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px rgba(88,73,212,0.65);
    transform: scale(1.04);
  }
</style>
