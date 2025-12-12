<script lang="ts">
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import GenericList from '$lib/components/GenericList.svelte';
  import OrderRow from './OrderRow.svelte';
  import type { Readable } from 'svelte/store';
  import { browser } from '$app/environment';
  import { getOrdersByBuyer, getOrder, subscribeBuyerOrderEvents } from '$lib/orders/ordersAdapter';
  import type { OrderStatusSseEvent } from '$lib/orders/types';
  import { getMarketClient } from '$lib/sdk/marketClient';
  import { signInWithSafe } from '$lib/auth/signin';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import ActionButtonBar from '$lib/components/layout/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/components/layout/ActionButtonDropDown.svelte';
  import type { Action } from '$lib/components/layout/Action';

  type ListItem = {
    id: string; // non-secret identifier for display (orderNumber or paymentReference)
    status?: string;
    total?: { price?: number | null; priceCurrency?: string | null } | null;
    customerId?: string | null;
    snapshot?: any; // full order snapshot for popup
  };

  // Build a simple readable-like object compatible with GenericList
  let ordersStore: Readable<{ data: ListItem[]; next: () => Promise<boolean>; ended: boolean }>;

  function mapItems(items: any[]): ListItem[] {
    return items.map((s, i) => ({
      // Use non-secret orderNumber if available; otherwise fall back to paymentReference
      id: (s as any)?.orderNumber ?? (s as any)?.paymentReference ?? `ord_${i}`,
      status: (s as any)?.orderStatus,
      total: (s as any)?.totalPaymentDue ?? null,
      customerId: (s as any)?.customer?.['@id'] ?? null,
      snapshot: s,
    }));
  }

  function buildAuthedStore(): Readable<{ data: ListItem[]; next: () => Promise<boolean>; ended: boolean }>{
    type State = { data: ListItem[]; ended: boolean; next: () => Promise<boolean>; page: number; loading: boolean };
    const subscribers = new Set<(v: State) => void>();
    const notify = (v: State) => subscribers.forEach((fn) => fn(v));

    let stopSse: (() => void) | null = null;

    function ensureSse() {
      if (stopSse) return;
      stopSse = subscribeBuyerOrderEvents(async (evt: OrderStatusSseEvent) => {
        if (!evt || typeof evt.orderId !== 'string') return;
        // Update the list item if present
        const idx = state.data.findIndex((it) => it.id === evt.orderId);
        if (idx >= 0) {
          const cur = state.data[idx];
          const updated = { ...cur, status: evt.newStatus };
          const nextData = state.data.slice();
          nextData[idx] = updated;
          state = { ...state, data: nextData };
          notify(state);
        }
        // If payment completed or delivered, refresh full snapshot for authoritative data (e.g., outbox items)
        if (evt.newStatus === 'https://schema.org/PaymentComplete' || evt.newStatus === 'https://schema.org/OrderDelivered') {
          try {
            const snap = await getOrder(evt.orderId!);
            const idx2 = state.data.findIndex((it) => it.id === evt.orderId);
            if (idx2 >= 0) {
              const total = (snap as any)?.totalPaymentDue ?? state.data[idx2].total ?? null;
              const next = { ...state.data[idx2], status: (snap as any)?.orderStatus ?? evt.newStatus, total, snapshot: snap };
              const arr = state.data.slice();
              arr[idx2] = next;
              state = { ...state, data: arr };
              notify(state);

              // If we have at least one outbox item, surface details popup to the user
              const outbox = (snap as any)?.outbox;
              if (Array.isArray(outbox) && outbox.length > 0) {
                const { popupControls } = await import('$lib/stores/popUp');
                const { default: OrderDetailsPopup } = await import('$lib/orders/OrderDetailsPopup.svelte');
                popupControls.open({ title: 'Order updated', component: OrderDetailsPopup, props: { snapshot: snap } });
              }
            }
          } catch {
            // ignore fetch errors
          }
        }
      }) as (() => void) | null;
    }

    function stopSseIfIdle() {
      if (subscribers.size === 0 && stopSse) {
        try { stopSse(); } catch {}
        stopSse = null;
      }
    }

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
        // Start SSE when first subscriber appears
        if (subscribers.size === 1) ensureSse();
        run(state);
        return () => {
          subscribers.delete(run);
          stopSseIfIdle();
        };
      },
    } as any;
  }

  // Remove fallback based on locally stored order IDs to avoid exposing secrets.
  function buildFallbackStore(): Readable<{ data: ListItem[]; next: () => Promise<boolean>; ended: boolean }>{
    type State = { data: ListItem[]; ended: boolean; next: () => Promise<boolean> };
    const subscribers = new Set<(v: State) => void>();
    const notify = (v: State) => subscribers.forEach((fn) => fn(v));
    let state: State = {
      data: [],
      ended: true,
      next: async () => true,
    };
    return {
      subscribe(run: (v: State) => void) {
        subscribers.add(run);
        run(state);
        return () => { subscribers.delete(run); };
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
      const avatar = (
        (avatarState.avatar as any)?.address ??
        (avatarState.avatar as any)?.avatarInfo?.avatar ??
        ''
      ).toLowerCase();

      if (!avatar || !/^0x[a-f0-9]{40}$/.test(avatar)) {
        throw new Error('No Circles avatar address available for Safe login');
      }

      await signInWithSafe(avatar);

      authed = !!getMarketClient().auth.getAuthMeta();
      ordersStore = buildAuthedStore();
      actions = [
        { id: 'signin', label: 'Signed in', variant: 'ghost', onClick: () => {} },
      ];
    } catch (e) {
      console.error('[orders] safe sign-in failed:', e);
      authed = false;
      ordersStore = buildFallbackStore();
      actions = [
        {
          id: 'signin',
          label: 'Sign in to view all orders',
          variant: 'primary',
          onClick: () => { void ensureAuthed(); },
        },
      ];
    }
  }

  // Build on client only
  if (browser) {
    authed = !!getMarketClient().auth.getAuthMeta();
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
      : 'Sign in to view orders'}
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

  <GenericList store={ordersStore} row={OrderRow} getKey={(it) => it.id} />
</PageScaffold>
