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

<div class={`avatar-skeleton inline-flex items-center min-w-0 max-w-full ${reverse ? 'flex-row-reverse' : ''}`}>
  <div class="relative inline-block shrink-0">
    {#if showAvatar}
      <div class="avatar-skeleton-block w-10 h-10 rounded-full block" aria-hidden="true"></div>
    {/if}
    {#if showBookmarkBadge}
      <span
        class="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full avatar-skeleton-block"
        aria-hidden="true"
      ></span>
    {/if}
    {#if showOverlay}
      <span
        class="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border border-base-100 avatar-skeleton-block"
        aria-hidden="true"
      ></span>
    {/if}
  </div>
  <div class={`flex flex-col gap-y-0.5 min-w-0 ${reverse ? 'items-end pr-4 text-right' : 'items-start pl-4'}`}>
    {#if showTop}
      <div class="avatar-skeleton-block h-4 rounded w-20" aria-hidden="true"></div>
    {/if}
    <div class="avatar-skeleton-block h-6 rounded w-28 max-w-full" aria-hidden="true"></div>
    {#if showBottom}
      <div class="avatar-skeleton-block h-4 rounded w-24 max-w-full" aria-hidden="true"></div>
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
