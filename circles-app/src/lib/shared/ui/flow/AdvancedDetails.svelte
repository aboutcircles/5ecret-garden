<script lang="ts">
  import type { Snippet } from 'svelte';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

  interface Props {
    title?: string;
    subtitle?: string;
    open?: boolean;
    className?: string;
    children?: Snippet;
  }

  let {
    title = 'Advanced details',
    subtitle,
    open = false,
    className = '',
    children,
  }: Props = $props();
</script>

<details
  class={className}
  style="
    border-radius:14px;border:1px solid {T.hairlineSoft};
    background:{T.surfaceAlt};padding:12px 14px;
  "
  {open}
>
  <summary style="
    cursor:pointer;list-style:none;
    display:flex;align-items:center;justify-content:space-between;gap:8px;
  ">
    <span style="display:inline-flex;align-items:center;gap:8px;min-width:0;">
      <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">{title}</span>
      {#if subtitle}
        <span style="font-size:11.5px;color:{T.inkSubtle};font-weight:500;">{subtitle}</span>
      {/if}
    </span>
    <span class="advanced-chevron" style="display:inline-flex;flex-shrink:0;color:{T.inkMuted};">
      <Icon name="chevronDown" size={14} stroke={T.inkMuted} />
    </span>
  </summary>
  <div style="margin-top:12px;font-size:13px;color:{T.inkBody};display:flex;flex-direction:column;gap:8px;">
    {@render children?.()}
  </div>
</details>

<style>
  summary::-webkit-details-marker { display: none; }
  details[open] :global(.advanced-chevron) { transform: rotate(180deg); transition: transform .15s ease-out; }
  :global(.advanced-chevron) { transition: transform .15s ease-out; }
</style>
