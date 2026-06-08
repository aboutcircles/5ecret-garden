<script lang="ts">
  import type { Snippet } from 'svelte';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

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

  const palette = $derived.by(() => {
    switch (variant) {
      case 'success': return { bg: T.positiveSoft, border: 'rgba(45,138,82,0.15)', fg: T.positive, icon: 'check' as const };
      case 'warning': return { bg: T.warningSoft, border: 'rgba(176,112,20,0.18)', fg: T.warning, icon: 'info' as const };
      case 'error':   return { bg: T.negativeSoft, border: 'rgba(196,68,48,0.18)', fg: T.negative, icon: 'info' as const };
      default:        return { bg: T.primaryFaint, border: 'rgba(88,73,212,0.18)', fg: T.primaryDeep, icon: 'info' as const };
    }
  });
</script>

<div
  class={className}
  role={variant === 'error' ? 'alert' : 'status'}
  aria-live={ariaLive}
  style="
    background:{palette.bg};
    border:1px solid {palette.border};
    border-radius:14px;
    padding:12px 14px;
    display:flex;align-items:flex-start;gap:10px;
  "
>
  <div style="
    width:28px;height:28px;border-radius:9px;flex-shrink:0;
    background:rgba(255,255,255,0.55);
    display:inline-flex;align-items:center;justify-content:center;
    margin-top:1px;
  ">
    <Icon name={palette.icon} size={14} stroke={palette.fg} strokeWidth={2} />
  </div>

  <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;">
    {#if title}
      <div style="font-family:{T.fontSans};font-size:13px;font-weight:600;color:{palette.fg};letter-spacing:-0.005em;">{title}</div>
    {/if}
    {#if message}
      <div style="font-size:12.5px;color:{T.inkBody};line-height:1.5;">{message}</div>
    {/if}
    {@render children?.()}
    {#if action}
      <div style="margin-top:6px;">
        {@render action()}
      </div>
    {/if}
  </div>
</div>
