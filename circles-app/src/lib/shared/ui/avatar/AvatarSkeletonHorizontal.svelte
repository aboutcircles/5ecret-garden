<script lang="ts">
  interface Props {
    reverse?: boolean;
    showAvatar?: boolean;
    showTop?: boolean;
    showBottom?: boolean;
    showBookmarkBadge?: boolean;
    showOverlay?: boolean;
  }

  let {
    reverse = false,
    showAvatar = true,
    showTop = true,
    showBottom = true,
    showBookmarkBadge = false,
    showOverlay = false,
  }: Props = $props();
</script>

<div class="avatar-skeleton" style={`display:inline-flex;align-items:center;min-width:0;max-width:100%;${reverse ? 'flex-direction:row-reverse;' : ''}`}>
  <div style="position:relative;display:inline-block;flex-shrink:0;">
    {#if showAvatar}
      <div class="avatar-skeleton-block" style="width:40px;height:40px;border-radius:9999px;display:block;" aria-hidden="true"></div>
    {/if}
    {#if showBookmarkBadge}
      <span
        class="avatar-skeleton-block"
        style="position:absolute;top:-4px;right:-4px;display:inline-flex;width:16px;height:16px;align-items:center;justify-content:center;border-radius:9999px;"
        aria-hidden="true"
      ></span>
    {/if}
    {#if showOverlay}
      <span
        class="avatar-skeleton-block"
        style="position:absolute;bottom:-4px;right:-4px;width:20px;height:20px;border-radius:9999px;border:1px solid rgba(0,0,0,0.06);"
        aria-hidden="true"
      ></span>
    {/if}
  </div>
  <div style={`display:flex;flex-direction:column;gap:2px;min-width:0;${reverse ? 'align-items:flex-end;padding-right:16px;text-align:right;' : 'align-items:flex-start;padding-left:16px;'}`}>
    {#if showTop}
      <div class="avatar-skeleton-block" style="height:16px;border-radius:4px;width:80px;" aria-hidden="true"></div>
    {/if}
    <div class="avatar-skeleton-block" style="height:24px;border-radius:4px;width:112px;max-width:100%;" aria-hidden="true"></div>
    {#if showBottom}
      <div class="avatar-skeleton-block" style="height:16px;border-radius:4px;width:96px;max-width:100%;" aria-hidden="true"></div>
    {/if}
  </div>
</div>

<style>
  .avatar-skeleton {
    position: relative;
    overflow: hidden;
  }

  .avatar-skeleton-block {
    background: color-mix(in oklab, currentColor 16%, transparent);
  }

  @media (prefers-reduced-motion: no-preference) {
    .avatar-skeleton::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
      transform: translateX(-100%);
      animation: avatar-shimmer 1.1s infinite;
      pointer-events: none;
    }

    @keyframes avatar-shimmer {
      100% {
        transform: translateX(100%);
      }
    }
  }
</style>
