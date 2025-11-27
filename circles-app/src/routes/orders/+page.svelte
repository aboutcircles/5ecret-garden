<script lang="ts">
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import GenericList from '$lib/components/GenericList.svelte';
  import OrderRow from './OrderRow.svelte';
  import { listStoredOrderIds } from '$lib/cart/orders-local';
  import type { Readable } from 'svelte/store';
  import { browser } from '$app/environment';
  import { getOrdersBatch, getOrdersByBuyer } from '$lib/cart/client';
  import { getAuthMeta } from '$lib/auth/siwe';
  import { signInWithWallet } from '$lib/auth/signin';
  import ActionButtonBar from '$lib/components/layout/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/components/layout/ActionButtonDropDown.svelte';
  import type { Action } from '$lib/components/layout/Action';

  type ListItem = {
    id: string; // orderNumber
    status?: string;
    total?: { price?: number | null; priceCurrency?: string | null } | null;
    customerId?: string | null;
  } & { blockNumber: number; transactionIndex: number; logIndex: number; address?: string };

  // Build a simple readable-like object compatible with GenericList
  let ordersStore: Readable<{ data: ListItem[]; next: () => Promise<boolean>; ended: boolean }>;

  function mapItems(items: any[]): ListItem[] {
    const now = Date.now();
    return items.map((s, i) => ({
      id: (s as any)?.orderNumber ?? (s as any)?.id ?? `ord_${i}`,
      status: (s as any)?.orderStatus,
      total: (s as any)?.totalPaymentDue ?? null,
      customerId: (s as any)?.customer?.['@id'] ?? null,
      blockNumber: now - i,
      transactionIndex: i,
      logIndex: 0,
      address: (s as any)?.orderNumber ?? (s as any)?.id ?? undefined,
    }));
  }

  function buildAuthedStore(): Readable<{ data: ListItem[]; next: () => Promise<boolean>; ended: boolean }>{
    type State = { data: ListItem[]; ended: boolean; next: () => Promise<boolean>; page: number; loading: boolean };
    const subscribers = new Set<(v: State) => void>();
    const notify = (v: State) => subscribers.forEach((fn) => fn(v));

    let state: State = {
      data: [],
      ended: false,
      page: 0,
      loading: false,
      next: async () => {
        if (state.loading || state.ended) return true;
        state = { ...state, loading: true };
        notify(state);
        try {
          const nextPage = state.page + 1;
          const resp = await getOrdersByBuyer(nextPage, 50);
          const items = Array.isArray(resp?.items) ? resp.items : [];
          const data = state.data.concat(mapItems(items));
          const ended = items.length === 0; // until API exposes paging metadata
          state = { ...state, data, page: nextPage, ended, loading: false };
          notify(state);
          return true;
        } catch (e) {
          // On 401 or any error, stop further loading
          state = { ...state, ended: true, loading: false };
          notify(state);
          return true;
        }
      },
    };

    return {
      subscribe(run: (v: State) => void) {
        subscribers.add(run);
        run(state);
        return () => {
          subscribers.delete(run);
        };
      },
    } as any;
  }

  function buildFallbackStore(): Readable<{ data: ListItem[]; next: () => Promise<boolean>; ended: boolean }>{
    const ids = listStoredOrderIds();
    type State = { data: ListItem[]; ended: boolean; next: () => Promise<boolean> };
    const subscribers = new Set<(v: State) => void>();
    const notify = (v: State) => subscribers.forEach((fn) => fn(v));
    let loaded = false;

    let state: State = {
      data: [],
      ended: ids.length === 0 ? true : false,
      next: async () => {
        if (loaded) return true;
        loaded = true;
        try {
          if (ids.length === 0) {
            state = { ...state, data: [], ended: true };
            notify(state);
            return true;
          }
          const snapshots = await getOrdersBatch(ids);
          state = { ...state, data: mapItems(snapshots || []), ended: true };
          notify(state);
          return true;
        } catch (e) {
          state = { ...state, data: [], ended: true };
          notify(state);
          return true;
        }
      },
    };

    return {
      subscribe(run: (v: State) => void) {
        subscribers.add(run);
        run(state);
        return () => {
          subscribers.delete(run);
        };
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

  let authed = false;
  let actions: Action[] = [];

  async function ensureAuthed() {
    try {
      await signInWithWallet();
      authed = !!getAuthMeta();
      ordersStore = buildAuthedStore();
      actions = [
        { id: 'signin', label: 'Signed in', variant: 'ghost', onClick: () => {} },
      ];
    } catch (e) {
      authed = false;
      ordersStore = buildFallbackStore();
      actions = [
        { id: 'signin', label: 'Sign in to view all orders', variant: 'primary', onClick: () => ensureAuthed() },
      ];
    }
  }

  // Build on client only
  if (browser) {
    authed = !!getAuthMeta();
    ordersStore = authed ? buildAuthedStore() : buildFallbackStore();
    actions = [
      {
        id: 'signin',
        label: authed ? 'Signed in' : 'Sign in to view all orders',
        variant: authed ? 'ghost' : 'primary',
        onClick: () => {
          if (!authed) void ensureAuthed();
        },
      },
    ];
  } else {
    ordersStore = emptyStore;
  }
</script>

<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg"
              contentWidthClass="page page--lg" usePagePadding={true} headerTopGapClass="mt-4 md:mt-6"
              collapsedTopGapClass="mt-3 md:mt-4">
  <svelte:fragment slot="title">
    <h1 class="h2">My Orders</h1>
  </svelte:fragment>
  <svelte:fragment slot="meta">
    {authed
      ? 'Orders for the authenticated wallet'
      : 'Recent orders stored on this device (sign in to see all)'}
  </svelte:fragment>
  <svelte:fragment slot="actions">
    <ActionButtonBar {actions} />
  </svelte:fragment>
  <svelte:fragment slot="collapsed-left">
    <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">Orders</span>
  </svelte:fragment>
  <svelte:fragment slot="collapsed-menu">
    <ActionButtonDropDown {actions} />
  </svelte:fragment>

  <GenericList store={ordersStore} row={OrderRow} />
</PageScaffold>
