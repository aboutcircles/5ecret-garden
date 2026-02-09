<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { Readable } from 'svelte/store';
  import MarketAuthListSection from '$lib/areas/settings/ui/sections/MarketAuthListSection.svelte';
  import OrderRow from '$lib/areas/market/ui/OrderRow.svelte';

  type Props = {
    avatarAddress: Address | '';
    ordersAuthed: boolean;
    ensureOrdersAuthed: () => Promise<void>;
    ordersStore: Readable<{ data: any[]; next: () => Promise<boolean>; ended: boolean }>;
  };

  let { avatarAddress, ordersAuthed, ensureOrdersAuthed, ordersStore }: Props = $props();
</script>

<MarketAuthListSection
  title="Orders"
  description="Orders for the authenticated wallet."
  {avatarAddress}
  authed={ordersAuthed}
  ensureAuthed={ensureOrdersAuthed}
  store={ordersStore}
  row={OrderRow}
  connectMessage="Connect an avatar to sign in and view orders."
  signInMessage="Sign in to view orders."
/>
