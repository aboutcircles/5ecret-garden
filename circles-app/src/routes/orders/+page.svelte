<script lang="ts">
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import GenericList from '$lib/components/GenericList.svelte';
  import OrderRow from './OrderRow.svelte';
  import { listStoredOrderIds } from '$lib/cart/orders-local';
  import type { Readable } from 'svelte/store';
  import { browser } from '$app/environment';

  type ListItem = { id: string; createdAt?: string } & { blockNumber: number; transactionIndex: number; logIndex: number; address?: string };

  // Build a simple readable-like object compatible with GenericList
  let ordersStore: Readable<{ data: ListItem[]; next: () => Promise<boolean>; ended: boolean }>; 

  function buildStore(): Readable<{ data: ListItem[]; next: () => Promise<boolean>; ended: boolean }>{
    const ids = listStoredOrderIds();
    // Optionally we could store timestamps alongside, but for now only id
    const now = Date.now();
    const data: ListItem[] = ids.map((id, i) => ({
      id,
      blockNumber: now - i,
      transactionIndex: i,
      logIndex: 0,
      address: id,
    }));
    return {
      subscribe(run: any) {
        run({ data, next: async () => true, ended: true });
        return () => {};
      },
    } as any;
  }
  // Minimal no-op readable to avoid SSR issues when store isn't available yet
  const emptyStore: Readable<{ data: ListItem[]; next: () => Promise<boolean>; ended: boolean }> = {
    subscribe(run: any) {
      run({ data: [], next: async () => true, ended: true });
      return () => {};
    },
  } as any;

  // Build on client only, since localStorage is not available on the server
  ordersStore = browser ? buildStore() : emptyStore;

  const actions: { id: string; label: string; variant: 'primary' | 'ghost'; onClick: () => void }[] = [];
</script>

<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg"
              contentWidthClass="page page--lg" usePagePadding={true} headerTopGapClass="mt-4 md:mt-6"
              collapsedTopGapClass="mt-3 md:mt-4">
  <svelte:fragment slot="title">
    <h1 class="h2">My Orders</h1>
  </svelte:fragment>
  <svelte:fragment slot="meta">
    Recent order ids stored on this device
  </svelte:fragment>
  <svelte:fragment slot="actions">
    {#each actions as a (a.id)}
      <button type="button" class={`btn btn-sm ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`}
              onclick={a.onClick} aria-label={a.label}>
        <span>{a.label}</span>
      </button>
    {/each}
  </svelte:fragment>
  <svelte:fragment slot="collapsed-left">
    <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">Orders</span>
  </svelte:fragment>
  <svelte:fragment slot="collapsed-menu">
    {#each actions as a (a.id)}
      <button
        type="button"
        class={`btn ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'} min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] w-full justify-start px-3`}
        onclick={a.onClick}
        aria-label={a.label}
      >
        <span>{a.label}</span>
      </button>
    {/each}
  </svelte:fragment>

  <GenericList store={ordersStore} row={OrderRow} />
</PageScaffold>
