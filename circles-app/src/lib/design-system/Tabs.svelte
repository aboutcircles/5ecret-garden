<script lang="ts">
  import { T } from './tokens.js';

  interface TabItem {
    id: string;
    label: string;
    count?: number;
  }

  interface Props {
    items: TabItem[];
    value: string;
    onchange?: (id: string) => void;
    style?: string;
  }

  let { items, value, onchange, style = '' }: Props = $props();
</script>

<div style="
  display: inline-flex; gap: 4px; padding: 4px; border-radius: 9999px;
  background: {T.pageDeep};
  {style}
">
  {#each items as item}
    {@const active = item.id === value}
    <button
      onclick={() => onchange?.(item.id)}
      style="
        height: 32px; padding: 0 14px; border-radius: 9999px; border: 0; cursor: pointer;
        background: {active ? T.surface : 'transparent'};
        box-shadow: {active ? T.shadow.xs : 'none'};
        color: {active ? T.ink : T.inkMuted};
        font-family: {T.fontSans}; font-size: 13px; font-weight: {active ? 580 : 500};
        display: inline-flex; align-items: center; gap: 6px;
      "
    >
      {item.label}
      {#if item.count != null}
        <span style="font-size: 11px; color: {T.inkSubtle}; font-variant-numeric: tabular-nums;">{item.count}</span>
      {/if}
    </button>
  {/each}
</div>
