<script lang="ts">
  import type { Component } from 'svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import { derived, readable, writable, type Readable, type Writable } from 'svelte/store';
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import { createPaginatedList } from '$lib/shared/state/paginatedList';
  import { createSearchablePaginatedList } from '$lib/shared/state/searchablePaginatedList';

  interface Props<T> {
    items: Readable<T[]>;
    row: Component<{ item: T }>;
    placeholderRow?: Component<{ height?: number; index?: number }>;
    getKey?: (item: T) => string;
    addressOf: (item: T) => string;
    onInputKeydown?: (event: KeyboardEvent) => void;
    inputDataAttribute?: string;

    loading?: boolean;
    error?: string | null;
    ended?: boolean;
    emptyRequiresEnd?: boolean;

    /**
     * Optional lazy-load hook. When supplied, the list uses the parent's
     * `next` + `ended` for VirtualList prefetch instead of in-memory page
     * reveal. Search filters whatever is currently loaded.
     */
    next?: () => Promise<boolean>;

    rowHeight?: number;
    pageSize?: number;
    totalKnownCount?: number;

    emptyLabel?: string;
    noMatchesLabel?: string;
    searchPlaceholder?: string;
  }

  let {
    items,
    row,
    getKey,
    addressOf,
    onInputKeydown,
    inputDataAttribute,
    loading = false,
    error = null,
    ended = false,
    emptyRequiresEnd = false,
    next,
    rowHeight = 64,
    pageSize = 25,
    totalKnownCount,
    emptyLabel = 'No entries',
    noMatchesLabel = 'No matches',
    searchPlaceholder = 'Search by address or name',
    placeholderRow
  }: Props<any> = $props();

  const emptyItems = readable<any[]>([]);

  let searchQuery = $state<Writable<string>>(writable(''));
  let filteredItems = $state<Readable<any[]>>(emptyItems);
  let paginatedItems = $state(createPaginatedList(emptyItems, { pageSize: 1 }));

  $effect(() => {
    const nextSearchable = createSearchablePaginatedList(items, {
      pageSize,
      addressOf: (item) => addressOf(item) as Address
    });

    searchQuery = nextSearchable.searchQuery;
    filteredItems = nextSearchable.filteredItems;
    paginatedItems = nextSearchable.paginatedItems;
  });

  // When the caller drives pagination externally (`next` prop given), bypass
  // the in-memory page-reveal store. VirtualList instead consumes the full
  // filtered set with the external next/ended so it can fetch more data on
  // scroll. Internal in-memory pagination is preserved for the fixed-list
  // callers that don't pass `next`.
  const externalStore = $derived(
    next
      ? derived(filteredItems, ($filtered) => ({
          data: $filtered ?? [],
          next: next!,
          ended,
          error: error ?? null,
        }))
      : null
  );
</script>

<ListShell
  query={searchQuery}
  searchPlaceholder={searchPlaceholder}
  {inputDataAttribute}
  {onInputKeydown}
  {loading}
  {error}
  {ended}
  {emptyRequiresEnd}
  isEmpty={($items ?? []).length === 0}
  isNoMatches={($items ?? []).length > 0 && ($filteredItems ?? []).length === 0}
  emptyLabel={emptyLabel}
  noMatchesLabel={noMatchesLabel}
>
  {#if externalStore}
    <GenericList
      store={externalStore}
      {row}
      getKey={getKey}
      rowHeight={rowHeight}
      maxPlaceholderPages={2}
      expectedPageSize={pageSize}
      {totalKnownCount}
      {placeholderRow}
    />
  {:else}
    <GenericList
      store={paginatedItems}
      {row}
      getKey={getKey}
      rowHeight={rowHeight}
      maxPlaceholderPages={2}
      expectedPageSize={pageSize}
      {totalKnownCount}
      {placeholderRow}
    />
  {/if}
</ListShell>
