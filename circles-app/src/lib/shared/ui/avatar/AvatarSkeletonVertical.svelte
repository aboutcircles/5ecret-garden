<script lang="ts">
  interface Props {
    showAvatar?: boolean;
    showTop?: boolean;
    showBottom?: boolean;
    showBookmarkBadge?: boolean;
  }

  let {
    showAvatar = true,
    showTop = true,
    showBottom = true,
    showBookmarkBadge = false,
  }: Props = $props();
</script>

<div class="avatar-skeleton" style="width:100%;display:flex;flex-direction:column;align-items:center;text-align:center;">
  <span style="position:relative;display:inline-flex;">
    {#if showAvatar}
      <div class="avatar-skeleton-block" style="width:80px;height:80px;border-radius:9999px;" aria-hidden="true"></div>
    {/if}
    {#if showBookmarkBadge}
      <span
        class="avatar-skeleton-block"
        style="position:absolute;top:-4px;right:-4px;display:inline-flex;width:20px;height:20px;align-items:center;justify-content:center;border-radius:9999px;"
        aria-hidden="true"
      ></span>
    {/if}
  </span>
  <div style="display:flex;flex-direction:column;align-items:center;padding:16px;gap:2px;width:100%;">
    {#if showTop}
      <div class="avatar-skeleton-block" style="height:24px;border-radius:4px;width:112px;max-width:100%;" aria-hidden="true"></div>
    {/if}
    {#if showBottom}
      <div class="avatar-skeleton-block" style="height:16px;border-radius:4px;width:160px;max-width:100%;" aria-hidden="true"></div>
    {/if}
  </div>
</div>

<style>
  .avatar-skeleton {
    position: relative;
    overflow: hidden;
  }

  .avatar-skeleton-block {
    background: rgba(0,0,0,0.08);
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
