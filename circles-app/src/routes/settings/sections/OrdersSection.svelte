<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { Readable } from 'svelte/store';
  import GenericList from '$lib/components/GenericList.svelte';
  import OrderRow from '../../orders/OrderRow.svelte';

  type Props = {
    avatarAddress: Address | '';
    ordersAuthed: boolean;
    ensureOrdersAuthed: () => Promise<void>;
    ordersStore: Readable<{ data: any[]; next: () => Promise<boolean>; ended: boolean }>;
  };

  let { avatarAddress, ordersAuthed, ensureOrdersAuthed, ordersStore }: Props = $props();
</script>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  <div class="text-sm mb-2">
    <strong>My Orders</strong>
    <span class="opacity-60"> · Orders for the authenticated wallet</span>
  </div>

  {#if !avatarAddress}
    <div class="text-sm opacity-70">Connect an avatar to sign in and view orders.</div>
  {:else if !ordersAuthed}
    <div class="text-sm opacity-70">
      Sign in to view orders.
      <button class="btn btn-primary btn-sm ml-2" onclick={() => ensureOrdersAuthed()}>
        Sign in
      </button>
    </div>
  {:else}
    <GenericList store={ordersStore} row={OrderRow} getKey={(it) => it.key} />
  {/if}
</section>
