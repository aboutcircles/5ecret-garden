<script lang="ts">
import Lucide from "$lib/shared/ui/icons/Lucide.svelte";

// Default to empty list; tolerate undefined entries
let { actions = [] as any[] } = $props();

</script>
{#each actions.filter(Boolean) as a, i (a?.id ?? a?.label ?? i)}
  <button
    type="button"
    class={`btn btn-sm ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'} min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] w-full justify-start px-3`}
    onclick={a.onClick}
    aria-label={a.label}
    disabled={!!a?.disabled}
    aria-disabled={!!a?.disabled}
  >
    {#if a.iconNode}
      <Lucide icon={a.iconNode} size={20} class="shrink-0" />
    {/if}
    <span>{a.label}</span>
  </button>
{/each}