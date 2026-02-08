<script lang="ts">
import Lucide from "$lib/shared/ui/icons/Lucide.svelte";

// Default to empty array and filter out invalid entries to avoid runtime errors
let { actions = [] as any[] } = $props();

</script>
{#each actions.filter(Boolean) as a, i (a?.id ?? a?.label ?? i)}
    <button
      type="button"
      class={`btn btn-sm ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`}
      onclick={a.onClick}
      aria-label={a.label}
      disabled={!!a?.disabled}
      aria-disabled={!!a?.disabled}
    >
        {#if a.iconNode}
            <Lucide icon={a.iconNode} size={16} class={`shrink-0 ${a.variant === 'primary' ? 'stroke-white' : 'stroke-black'}`} />
        {/if}
        <span>{a.label}</span>
    </button>
{/each}