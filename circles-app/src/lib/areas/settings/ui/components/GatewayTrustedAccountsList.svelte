<script lang="ts">
  import type { Readable } from 'svelte/store';
  import { derived, writable } from 'svelte/store';
  import GenericList from '$lib/shared/ui/common/GenericList.svelte';
  import { createPaginatedList } from '$lib/shared/state/paginatedList';
  import { createFilteredAddresses, createProfileNameStore } from '$lib/shared/utils/searchableProfiles';
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

  const searchQuery = writable('');
  const rowStore = writable<TrustRowItem[]>([]);
  const trustReceiverAddresses = derived(rowStore, ($rows) =>
    $rows.map((row) => row.trustReceiver as Address)
  );
  const profileNames = createProfileNameStore(trustReceiverAddresses);
  const filteredAddresses = createFilteredAddresses(
    trustReceiverAddresses,
    searchQuery,
    profileNames
  );
  const filteredRows = derived([rowStore, filteredAddresses], ([$rows, $filtered]) => {
    const allowed = new Set($filtered.map((addr) => addr.toLowerCase()));
    return $rows.filter((row) =>
      allowed.has(String(row.trustReceiver).toLowerCase())
    );
  });

  const paginatedRows = createPaginatedList(filteredRows, { pageSize });

  $effect(() => {
    rowStore.set($rows ?? []);
  });
</script>

<div class="mb-3">
  <input
    type="text"
    class="input input-bordered w-full"
    placeholder="Search by address or name"
    bind:value={$searchQuery}
  />
</div>

{#if loading}
  <div class="loading loading-spinner loading-sm"></div>
{:else if ($rows ?? []).length === 0}
  <div class="text-sm opacity-70">{emptyLabel}</div>
{:else if ($filteredRows ?? []).length === 0}
  <div class="text-sm opacity-70">{noMatchesLabel}</div>
{:else}
  <GenericList
    store={paginatedRows}
    row={TrustRowView}
    getKey={(item) => String(item.trustReceiver)}
    rowHeight={rowHeight}
    maxPlaceholderPages={2}
    expectedPageSize={pageSize}
  />
{/if}