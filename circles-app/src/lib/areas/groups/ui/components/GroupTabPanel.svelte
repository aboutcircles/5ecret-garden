<script lang="ts">
    import AvatarRowPlaceholder from '$lib/shared/ui/lists/placeholders/AvatarRowPlaceholder.svelte';
    import { T } from '$lib/design-system/tokens.js';

    type Props = {
        ownerAddress?: string | null;
        loading: boolean;
        error: string | null;
        items: unknown[];
        connectText: string;
        emptyText: string;
        loadingPlaceholderCount?: number;
    };

    let {
        ownerAddress,
        loading,
        error,
        items,
        connectText,
        emptyText,
        loadingPlaceholderCount = 5,
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
    <slot name="empty">
        <div style="width:100%;padding:24px 0;text-align:center;color:{T.inkMuted};">{emptyText}</div>
    </slot>
{:else}
    <div style="display:flex;flex-direction:column;">
        <slot {items} />
    </div>
{/if}
