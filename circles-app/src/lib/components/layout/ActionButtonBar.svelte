<script lang="ts">
import Lucide from "$lib/icons/Lucide.svelte";

const {actions} = $props();

</script>
{#each actions as a (a.id)}
    <button
      type="button"
      class={`btn btn-sm ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`}
      onclick={a.onClick}
      aria-label={a.label}
    >
        {#if a.iconNode}
            <Lucide icon={a.iconNode} size={16} class={`shrink-0 ${a.variant === 'primary' ? 'stroke-white' : 'stroke-black'}`} />
        {/if}
        <span>{a.label}</span>
    </button>
{/each}