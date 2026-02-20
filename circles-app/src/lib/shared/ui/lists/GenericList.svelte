<script lang="ts">
    import type { Component } from 'svelte';
    import type { EventRow, TransactionHistoryRow } from '@circles-sdk/data';
    import type { Readable } from 'svelte/store';
    import VirtualList from '$lib/shared/ui/lists/VirtualList.svelte';

    interface ListStoreValue<T = EventRow | TransactionHistoryRow> {
        data: T[];
        next: () => Promise<boolean>;
        ended: boolean;
        error?: string | null;
    }

    interface Props<T extends Record<string, any> = any> {
        store: Readable<ListStoreValue<T>>;
        row: Component<{ item: T }>;
        placeholderRow?: Component<{ height?: number; index?: number }>;
        getKey?: (item: T) => string;
        rowHeight?: number;
        maxPlaceholderPages?: number;
        expectedPageSize?: number;
        eagerLoadMultiplier?: number;
        overscan?: number;
    }

    let {
        store,
        row,
        placeholderRow,
        getKey,
        rowHeight = 64,
        maxPlaceholderPages = 2,
        expectedPageSize,
        eagerLoadMultiplier = 2,
        overscan = 8,
    }: Props = $props();
</script>

<VirtualList
    {store}
    {row}
    {placeholderRow}
    {getKey}
    {rowHeight}
    {maxPlaceholderPages}
    {expectedPageSize}
    {eagerLoadMultiplier}
    {overscan}
/>
