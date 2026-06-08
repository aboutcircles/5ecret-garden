<script lang="ts">
  import type { Snippet } from 'svelte';

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

<div class={`flex items-start justify-between gap-3 ${className}`.trim()}>
  <div class="min-w-0">
    <div class="text-xs text-base-content/60">{label}</div>
    {#if value}
      <div class={`text-sm ${valueClassName}`.trim()}>{value}</div>
    {/if}
    {@render children?.()}
  </div>

  {#if onChange}
    <button type="button" class="btn btn-ghost btn-xs" onclick={onChange}>
      {changeLabel}
    </button>
  {/if}
</div>
