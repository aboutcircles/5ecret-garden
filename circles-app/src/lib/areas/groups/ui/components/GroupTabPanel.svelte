<script lang="ts">
    type Props = {
        ownerAddress?: string | null;
        loading: boolean;
        error: string | null;
        items: unknown[];
        connectText: string;
        emptyText: string;
    };

    let { ownerAddress, loading, error, items, connectText, emptyText }: Props = $props();
</script>

{#if !ownerAddress}
    <div class="text-sm opacity-70">{connectText}</div>
{:else if loading}
    <div class="text-sm opacity-70">Loading…</div>
{:else if error}
    <div class="text-sm text-error">{error}</div>
{:else if items.length === 0}
    <slot name="empty">
        <div class="text-sm opacity-70">{emptyText}</div>
    </slot>
{:else}
    <div class="flex flex-col">
        <slot {items} />
    </div>
{/if}
