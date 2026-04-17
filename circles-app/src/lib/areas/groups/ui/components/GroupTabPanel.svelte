<script lang="ts">
    import AvatarRowPlaceholder from '$lib/shared/ui/lists/placeholders/AvatarRowPlaceholder.svelte';

    import type { Snippet } from 'svelte';

    type Props = {
        ownerAddress?: string | null;
        loading: boolean;
        error: string | null;
        items: unknown[];
        connectText: string;
        emptyText: string;
        loadingPlaceholderCount?: number;
        empty?: Snippet;
        children?: Snippet<[{ items: unknown[] }]>;
    };

    let {
        ownerAddress,
        loading,
        error,
        items,
        connectText,
        emptyText,
        loadingPlaceholderCount = 5,
        empty,
        children,
    }: Props = $props();

    const placeholderItems = $derived(Array.from({ length: loadingPlaceholderCount }, (_, i) => i));
</script>

{#if !ownerAddress}
    <div class="text-sm opacity-70">{connectText}</div>
{:else if loading}
    <div class="flex flex-col">
        {#each placeholderItems as index (index)}
            <AvatarRowPlaceholder height={64} />
        {/each}
    </div>
{:else if error}
    <div class="text-sm text-error">{error}</div>
{:else if items.length === 0}
    {#if empty}
        {@render empty()}
    {:else}
        <div class="w-full py-6 text-center text-base-content/60">{emptyText}</div>
    {/if}
{:else}
    <div class="flex flex-col">
        {#if children}
            {@render children({ items })}
        {/if}
    </div>
{/if}
