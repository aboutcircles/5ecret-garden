<script lang="ts">
  import type { Component } from 'svelte';
  import { readable, writable, type Readable, type Writable } from 'svelte/store';
  import GenericList from '$lib/shared/ui/common/GenericList.svelte';
  import ListShell from '$lib/shared/ui/common/ListShell.svelte';
  import { createPaginatedList } from '$lib/shared/state/paginatedList';
  import { createSearchablePaginatedList } from '$lib/shared/state/searchablePaginatedList';

  interface Props<T> {
    items: Readable<T[]>;
    row: Component<{ item: T }>;
    getKey?: (item: T) => string;
    addressOf: (item: T) => string;
    onInputKeydown?: (event: KeyboardEvent) => void;
    inputDataAttribute?: string;

    loading?: boolean;
    error?: string | null;

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
    rowHeight = 64,
    pageSize = 25,
    emptyLabel = 'No items',
    noMatchesLabel = 'No matches',
    searchPlaceholder = 'Search by address or name'
  }: Props<any> = $props();

  // Keep the stores as top-level bindings so they can be used with `$store` auto-subscription.
  // Initialized with safe placeholders, then replaced in an effect to stay reactive and avoid
  // `state_referenced_locally` warnings.
  const emptyItems = readable<any[]>([]);

  let searchQuery = $state<Writable<string>>(writable(''));
  let filteredItems = $state<Readable<any[]>>(emptyItems);
  let paginatedItems = $state(createPaginatedList(emptyItems, { pageSize: 1 }));
  let searchInputEl: HTMLInputElement | null = $state(null);

  $effect(() => {
    const next = createSearchablePaginatedList(items, {
      pageSize,
      // `createSearchablePaginatedList` expects a Circles `Address` type, but most of our callers
      // already operate on EVM address strings. Casting keeps API ergonomic.
      addressOf: (item) => addressOf(item) as any
    });

    searchQuery = next.searchQuery;
    filteredItems = next.filteredItems;
    paginatedItems = next.paginatedItems;
  });

  $effect(() => {
    if (!searchInputEl || !inputDataAttribute) return;
    searchInputEl.setAttribute(inputDataAttribute, 'true');
    return () => {
      searchInputEl?.removeAttribute(inputDataAttribute);
    };
  });
</script>

<ListShell
  query={searchQuery}
  searchPlaceholder={searchPlaceholder}
  bind:inputEl={searchInputEl}
  {onInputKeydown}
  {loading}
  {error}
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
  />
</ListShell>
