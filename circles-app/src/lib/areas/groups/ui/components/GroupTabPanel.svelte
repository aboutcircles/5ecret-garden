<script lang="ts">
    import type { Snippet } from 'svelte';

    type Props = {
        ownerAddress?: string | null;
        loading: boolean;
        error: string | null;
        items: unknown[];
        connectText: string;
        emptyText: string;
        empty?: Snippet;
        children?: Snippet<[unknown[]]>;
    };

    let { ownerAddress, loading, error, items, connectText, emptyText, empty, children }: Props = $props();
</script>

{#if !ownerAddress}
    <div class="text-sm opacity-70">{connectText}</div>
{:else if loading}
    <div class="text-sm opacity-70">Loading…</div>
{:else if error}
    <div class="text-sm text-error">{error}</div>
{:else if items.length === 0}
    {#if empty}{@render empty()}{:else}
        <div class="text-sm opacity-70">{emptyText}</div>
    {/if}
{:else}
    <div class="flex flex-col">
        {@render children?.(items)}
    </div>
{/if}
