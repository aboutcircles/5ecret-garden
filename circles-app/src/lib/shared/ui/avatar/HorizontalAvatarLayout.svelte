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
  // Reset image error when profile/image changes
  $effect(() => { imgUrl; imgError = false; });
</script>

<div style={`display:inline-flex;align-items:center;min-width:0;max-width:100%;${reverse ? 'flex-direction:row-reverse;' : ''}`}>
  <button class="avatar-img-btn" style="cursor:pointer;flex-shrink:0;background:none;border:0;padding:0;" {onclick}>
      <div class="avatar-img-wrap" style="position:relative;display:inline-block;">
        {#if imgUrl && !imgError}
          <img
            src={imgUrl}
            alt={profile?.name ?? 'Profile avatar'}
            style="width:40px;height:40px;object-fit:cover;border-radius:9999px;display:block;position:relative;z-index:1;"
            onerror={onImgError}
          />
        {:else}
          <img src="/logo.svg" alt="Fallback" style="width:40px;height:40px;object-fit:cover;border-radius:9999px;display:block;position:relative;z-index:1;" />
        {/if}

        {#if showBookmarkBadge}
          <span
            style="position:absolute;top:-4px;right:-4px;display:inline-flex;width:16px;height:16px;align-items:center;justify-content:center;border-radius:9999px;background:{T.warning};color:{T.surface};font-size:10px;line-height:1;font-weight:700;border:1px solid {T.surface};z-index:2;"
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
          style="position:absolute;bottom:-4px;right:-4px;width:20px;height:20px;border-radius:9999px;border:1px solid {T.surface};background:{T.surface};display:block;z-index:2;"
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
  /* Reset global button hover — avatars have their own ring treatment */
  .avatar-img-btn:hover,
  .avatar-img-btn:focus-visible {
    transform: none !important;
    box-shadow: none !important;
    filter: none !important;
  }

  /* Spinning conic ring using a masked pseudo-element */
  .avatar-img-wrap::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 9999px;
    background: conic-gradient(
      from 0deg,
      rgba(88,73,212,0.85) 0deg,
      rgba(167,139,250,0.5) 70deg,
      rgba(88,73,212,0) 110deg
    );
    /* cut out the centre so only a 2.5px ring shows */
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #fff calc(100% - 2.5px));
    mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #fff calc(100% - 2.5px));
    opacity: 0;
    transition: opacity 200ms ease-out;
    animation: avatar-ring-spin 1.1s linear infinite;
    animation-play-state: paused;
    pointer-events: none;
    z-index: 2;
  }

  .avatar-img-btn:hover .avatar-img-wrap::before,
  .avatar-img-btn:focus-visible .avatar-img-wrap::before {
    opacity: 1;
    animation-play-state: running;
  }

  @keyframes avatar-ring-spin {
    to { transform: rotate(360deg); }
  }
</style>
