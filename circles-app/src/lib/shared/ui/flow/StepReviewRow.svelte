<script lang="ts">
  import type { Snippet } from 'svelte';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    label: string;
    value?: string;
    onChange?: () => void;
    changeLabel?: string;
    className?: string;
    valueClassName?: string;
    children?: Snippet;
  }

  let {
    label,
    value,
    onChange,
    changeLabel = 'Change',
    className = '',
    valueClassName = '',
    children,
  }: Props = $props();
</script>

<div class={className} style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
  <div style="min-width:0;flex:1;">
    <div style="font-size:11px;font-weight:580;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;margin-bottom:3px;">{label}</div>
    {#if value}
      <div class={valueClassName} style="font-size:13.5px;color:{T.ink};font-weight:540;line-height:1.4;">{value}</div>
    {/if}
    {@render children?.()}
  </div>

  {#if onChange}
    <button
      type="button"
      onclick={onChange}
      style="
        flex-shrink:0;height:28px;padding:0 12px;border-radius:9999px;
        background:{T.surface};border:1px solid {T.hairline};color:{T.inkBody};
        font-family:{T.fontSans};font-size:12px;font-weight:540;cursor:pointer;
      "
    >
      {changeLabel}
    </button>
  {/if}
</div>
