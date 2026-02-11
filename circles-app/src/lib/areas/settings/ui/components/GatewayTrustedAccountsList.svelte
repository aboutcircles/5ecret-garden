<script lang="ts">
  import type { Readable } from 'svelte/store';
  import SearchablePaginatedList from '$lib/shared/ui/common/SearchablePaginatedList.svelte';
  import TrustRowView from '$lib/areas/settings/ui/components/TrustRow.svelte';
  import type { TrustRow } from '$lib/areas/settings/model/gatewayTypes';

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

  const TRUST_LIST_SCOPE = '[data-gateway-trust-list-scope]';

  function onInputArrowDown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown') return;
    const firstRow = document.querySelector<HTMLElement>(`${TRUST_LIST_SCOPE} [data-gateway-trust-row]`);
    if (!firstRow) return;
    event.preventDefault();
    firstRow.focus();
  }
</script>

<div data-gateway-trust-list-scope>
  <SearchablePaginatedList
    items={rows}
    row={TrustRowView}
    getKey={(item) => String(item.trustReceiver)}
    addressOf={(row) => String(row.trustReceiver)}
    onInputKeydown={onInputArrowDown}
    inputDataAttribute="data-gateway-trust-search-input"
    {loading}
    emptyLabel={emptyLabel}
    noMatchesLabel={noMatchesLabel}
    rowHeight={rowHeight}
    pageSize={pageSize}
    searchPlaceholder="Search by address or name"
  />
</div>