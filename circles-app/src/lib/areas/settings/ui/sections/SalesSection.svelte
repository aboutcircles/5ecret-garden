<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { Readable } from 'svelte/store';
  import MarketAuthListSection from '$lib/areas/settings/ui/sections/MarketAuthListSection.svelte';
  import SalesOrderRow from '$lib/areas/market/ui/SalesOrderRow.svelte';

  type Props = {
    avatarAddress: Address | '';
    salesAuthed: boolean;
    ensureSalesAuthed: () => Promise<void>;
    salesStore: Readable<{ data: any[]; next: () => Promise<boolean>; ended: boolean }>;
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