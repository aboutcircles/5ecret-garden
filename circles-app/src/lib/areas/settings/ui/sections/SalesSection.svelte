<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { Readable } from 'svelte/store';
  import GenericList from '$lib/shared/ui/common/GenericList.svelte';
  import SalesOrderRow from '$lib/areas/market/ui/SalesOrderRow.svelte';

  type Props = {
    avatarAddress: Address | '';
    salesAuthed: boolean;
    ensureSalesAuthed: () => Promise<void>;
    salesStore: Readable<{ data: any[]; next: () => Promise<boolean>; ended: boolean }>;
  };

  let { avatarAddress, salesAuthed, ensureSalesAuthed, salesStore }: Props = $props();
</script>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-sm font-semibold m-0">Sales</h3>
      <p class="text-xs text-base-content/70 mt-0.5">Orders received as a seller.</p>
    </div>
    {#if avatarAddress && !salesAuthed}
      <button class="btn btn-primary btn-sm" onclick={() => ensureSalesAuthed()}>
        Sign in
      </button>
    {/if}
  </div>
</section>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  {#if !avatarAddress}
    <div class="text-sm opacity-70">Connect an avatar to sign in and view sales.</div>
  {:else if !salesAuthed}
    <div class="text-sm opacity-70">Sign in to view sales.</div>
  {:else}
    <GenericList store={salesStore} row={SalesOrderRow} getKey={(it) => it.key} />
  {/if}
</section>