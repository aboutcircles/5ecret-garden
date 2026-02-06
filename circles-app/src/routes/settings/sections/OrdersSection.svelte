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
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-sm font-semibold m-0">Orders</h3>
      <p class="text-xs text-base-content/70 mt-0.5">Orders for the authenticated wallet.</p>
    </div>
    {#if avatarAddress && !ordersAuthed}
      <button class="btn btn-primary btn-sm" onclick={() => ensureOrdersAuthed()}>
        Sign in
      </button>
    {/if}
  </div>
</section>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  {#if !avatarAddress}
    <div class="text-sm opacity-70">Connect an avatar to sign in and view orders.</div>
  {:else if !ordersAuthed}
    <div class="text-sm opacity-70">Sign in to view orders.</div>
  {:else}
    <GenericList store={ordersStore} row={OrderRow} getKey={(it) => it.key} />
  {/if}
</section>
