<script lang="ts">
  import type { Address } from '@aboutcircles/sdk-types';
  import type { PaginatedReadable } from '$lib/shared/state/paginatedList';
  import type { MarketSalesListItem } from '$lib/areas/market/orders/ordersMappers';
  import MarketAuthListSection from '$lib/areas/settings/ui/sections/MarketAuthListSection.svelte';
  import SalesOrderRow from '$lib/areas/market/ui/SalesOrderRow.svelte';

  type Props = {
    avatarAddress: Address | '';
    salesAuthed: boolean;
    ensureSalesAuthed: () => Promise<void>;
    salesStore: PaginatedReadable<MarketSalesListItem>;
  };

  let { avatarAddress, salesAuthed, ensureSalesAuthed, salesStore }: Props = $props();
</script>

<MarketAuthListSection
  title="Sales"
  description="Orders received as a seller."
  {avatarAddress}
  authed={salesAuthed}
  ensureAuthed={ensureSalesAuthed}
  store={salesStore}
  row={SalesOrderRow}
  connectMessage="Connect an avatar to sign in and view sales."
  signInMessage="Sign in to view sales."
/>