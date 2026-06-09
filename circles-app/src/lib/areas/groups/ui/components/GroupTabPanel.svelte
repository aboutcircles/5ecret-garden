<script lang="ts">
    import AvatarRowPlaceholder from '$lib/shared/ui/lists/placeholders/AvatarRowPlaceholder.svelte';
    import { T } from '$lib/design-system/tokens.js';

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
    <div style="font-size:13px;opacity:0.7;">{connectText}</div>
{:else if loading}
    <div style="display:flex;flex-direction:column;">
        {#each placeholderItems as index (index)}
            <AvatarRowPlaceholder height={64} />
        {/each}
    </div>
{:else if error}
    <div style="font-size:13px;color:{T.negative};">{error}</div>
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
