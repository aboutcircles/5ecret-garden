<script lang="ts">
  import type { Readable } from 'svelte/store';
  import { writable } from 'svelte/store';
  import { readable, type Writable } from 'svelte/store';
  import GenericList from '$lib/shared/ui/common/GenericList.svelte';
  import ListStates from '$lib/shared/ui/common/ListStates.svelte';
  import ListToolbar from '$lib/shared/ui/common/ListToolbar.svelte';
  import { createSearchablePaginatedList } from '$lib/shared/state/searchablePaginatedList';
  import { createPaginatedList } from '$lib/shared/state/paginatedList';
  import TrustRowView from '$lib/areas/settings/ui/components/TrustRow.svelte';
  import type { TrustRow } from '$lib/areas/settings/model/gatewayTypes';
  import type { Address } from '@circles-sdk/utils';

  type TrustRowItem = TrustRow & {
    showRemove?: boolean;
    onRemove?: () => void;
  };

  interface Props {
    rows: Readable<TrustRowItem[]>;
    loading?: boolean;
    emptyLabel?: string;
    noMatchesLabel?: string;
    rowHeight?: number;
    pageSize?: number;
  }

  let {
    rows,
    loading = false,
    emptyLabel = 'No trusted accounts yet.',
    noMatchesLabel = 'No matching trusted accounts.',
    rowHeight = 72,
    pageSize = 25
  }: Props = $props();

  const rowStore = writable<TrustRowItem[]>([]);

  // Keep the stores as top-level bindings so they can be used with `$store` auto-subscription.
  // Initialized with safe placeholders, then re-created in an effect to stay reactive and avoid
  // `state_referenced_locally` warnings.
  const emptyItems = readable<TrustRowItem[]>([]);

  let searchQuery = $state<Writable<string>>(writable(''));
  let filteredItems = $state(emptyItems);
  let paginatedItems = $state(createPaginatedList(emptyItems, { pageSize: 1 }));

  $effect(() => {
    const next = createSearchablePaginatedList(rowStore, {
      pageSize,
      addressOf: (row) => row.trustReceiver as Address
    });

    searchQuery = next.searchQuery;
    filteredItems = next.filteredItems;
    paginatedItems = next.paginatedItems;
  });

  $effect(() => {
    rowStore.set($rows ?? []);
  });
</script>

<ListToolbar query={searchQuery} placeholder="Search by address or name" />

<ListStates
  {loading}
  isEmpty={($rows ?? []).length === 0}
  isNoMatches={($rows ?? []).length > 0 && ($filteredItems ?? []).length === 0}
  emptyLabel={emptyLabel}
  noMatchesLabel={noMatchesLabel}
>
  <GenericList
    store={paginatedItems}
    row={TrustRowView}
    getKey={(item) => String(item.trustReceiver)}
    rowHeight={rowHeight}
    maxPlaceholderPages={2}
    expectedPageSize={pageSize}
  />
</ListStates>