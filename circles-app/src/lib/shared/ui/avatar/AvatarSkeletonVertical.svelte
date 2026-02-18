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

<div class="avatar-skeleton w-full flex flex-col items-center text-center">
  <span class="relative inline-flex">
    {#if showAvatar}
      <div class="avatar-skeleton-block w-20 h-20 rounded-full" aria-hidden="true"></div>
    {/if}
    {#if showBookmarkBadge}
      <span
        class="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full avatar-skeleton-block"
        aria-hidden="true"
      ></span>
    {/if}
  </span>
  <div class="flex flex-col items-center p-4 gap-y-0.5 w-full">
    {#if showTop}
      <div class="avatar-skeleton-block h-6 rounded w-28 max-w-full" aria-hidden="true"></div>
    {/if}
    {#if showBottom}
      <div class="avatar-skeleton-block h-4 rounded w-40 max-w-full" aria-hidden="true"></div>
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
