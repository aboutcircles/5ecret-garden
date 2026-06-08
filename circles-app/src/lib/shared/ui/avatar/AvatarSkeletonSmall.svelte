<script lang="ts">
  interface Props {
    reverse?: boolean;
    showAvatar?: boolean;
    showText?: boolean;
  }

  let {
    reverse = false,
    showAvatar = true,
    showText = true,
  }: Props = $props();
</script>

<div class={`avatar-skeleton inline-flex items-center gap-2 ${reverse ? 'flex-row-reverse' : ''}`}>
  {#if showText}
    <div class="avatar-skeleton-block h-5 w-20 rounded inline-block align-middle" aria-hidden="true"></div>
  {/if}
  {#if showAvatar}
    <div class="avatar-skeleton-block w-6 h-6 rounded-full inline-block align-middle" aria-hidden="true"></div>
  {/if}
</div>

<style>
  .avatar-skeleton {
    position: relative;
    overflow: hidden;
  }

  .avatar-skeleton-block {
    background: hsl(var(--b3) / 0.7);
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
