<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'info' | 'warning' | 'error' | 'success';
    title?: string;
    message?: string;
    className?: string;
    ariaLive?: 'off' | 'polite' | 'assertive';
    action?: Snippet;
    children?: Snippet;
  }

  let {
    variant = 'info',
    title,
    message,
    className = '',
    ariaLive = 'polite',
    action,
    children,
  }: Props = $props();

  const variantClass = $derived(`alert-${variant}`);
</script>

<div
  class={`alert ${variantClass} py-2 text-sm ${className}`.trim()}
  role={variant === 'error' ? 'alert' : 'status'}
  aria-live={ariaLive}
>
  <div class="w-full flex items-start justify-between gap-2">
    <div class="min-w-0">
      {#if title}
        <div class="font-semibold">{title}</div>
      {/if}
      {#if message}
        <div>{message}</div>
      {/if}
      {@render children?.()}
    </div>
    {#if action}
      <div class="shrink-0">
        {@render action()}
      </div>
    {/if}
  </div>
</div>
