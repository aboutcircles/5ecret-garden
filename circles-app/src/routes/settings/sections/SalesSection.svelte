<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { Readable } from 'svelte/store';
  import GenericList from '$lib/components/GenericList.svelte';
  import SalesOrderRow from '../../sales/orders/SalesOrderRow.svelte';

  type Props = {
    avatarAddress: Address | '';
    salesAuthed: boolean;
    ensureSalesAuthed: () => Promise<void>;
    salesStore: Readable<{ data: any[]; next: () => Promise<boolean>; ended: boolean }>;
  };

  let { avatarAddress, salesAuthed, ensureSalesAuthed, salesStore }: Props = $props();
</script>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  <div class="text-sm mb-2">
    <strong>My Sales</strong>
    <span class="opacity-60"> · Orders received as a seller</span>
  </div>

  {#if !avatarAddress}
    <div class="text-sm opacity-70">Connect an avatar to sign in and view sales.</div>
  {:else if !salesAuthed}
    <div class="text-sm opacity-70">
      Sign in to view sales.
      <button class="btn btn-primary btn-sm ml-2" onclick={() => ensureSalesAuthed()}>
        Sign in
      </button>
    </div>
  {:else}
    <GenericList store={salesStore} row={SalesOrderRow} getKey={(it) => it.key} />
  {/if}
</section>