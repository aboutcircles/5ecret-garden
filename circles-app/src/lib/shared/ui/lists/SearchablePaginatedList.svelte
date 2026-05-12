<script lang="ts">
  import type { Component } from 'svelte';
  import { readable, writable, type Readable, type Writable } from 'svelte/store';
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

    rowHeight?: number;
    pageSize?: number;

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
    rowHeight = 64,
    pageSize = 25,
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
    const next = createSearchablePaginatedList(items, {
      pageSize,
      addressOf: (item) => addressOf(item) as any
    });

    searchQuery = next.searchQuery;
    filteredItems = next.filteredItems;
    paginatedItems = next.paginatedItems;
  });
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
  <GenericList
    store={paginatedItems}
    {row}
    getKey={getKey}
    rowHeight={rowHeight}
    maxPlaceholderPages={2}
    expectedPageSize={pageSize}
    {placeholderRow}
  />
</ListShell>
