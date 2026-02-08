<script lang="ts">
  import PageScaffold from '$lib/app/shell/PageScaffold.svelte';
  import GenericList from '$lib/components/GenericList.svelte';
  import OrderRow from './OrderRow.svelte';
  import type { Readable } from 'svelte/store';
  import { browser } from '$app/environment';
  import { getOrdersByBuyer, getOrder, subscribeBuyerOrderEvents } from '$lib/areas/market/orders/ordersAdapter';
  import type { OrderStatusSseEvent } from '$lib/areas/market/orders/types';
  import { getMarketClient } from '$lib/integrations/market';
  import { signInWithSafe } from '$lib/auth/signin';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import ActionButtonBar from '$lib/app/shell/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/app/shell/ActionButtonDropDown.svelte';
  import type { Action } from '$lib/types/actions';
  import { popupControls } from '$lib/shared/state/popup';
  import OrderDetailsPopup from '$lib/areas/market/orders/OrderDetailsPopup.svelte';

  type ListItem = {
    key: string; // stable order id used by SSE and fetch (orderNumber)
    displayId: string; // what we show (orderNumber or paymentReference fallback)
    status?: string;
    total?: { price?: number | null; priceCurrency?: string | null } | null;
    customerId?: string | null;
    snapshot?: any; // full order snapshot for popup
  };

  // Auth state must be initialized before using in $derived stores to avoid TDZ
  let authed = $state(false);

  // Build a simple readable-like object compatible with GenericList
  let ordersStore = $derived<Readable<{ data: ListItem[]; next: () => Promise<boolean>; ended: boolean }>>(
    browser
      ? (authed ? buildAuthedStore() : buildFallbackStore())
      : ({
          subscribe(run: any) {
            run({ data: [], next: async () => true, ended: true });
            return () => {};
          },
        } as any)
  );

  function mapItems(items: any[]): ListItem[] {
    return items.map((s, i) => {
      const orderId = (s as any)?.orderNumber ?? `ord_${i}`;
      const displayId = (s as any)?.orderNumber ?? (s as any)?.paymentReference ?? `ord_${i}`;
      return {
        key: orderId,
        displayId,
        status: (s as any)?.orderStatus,
        total: (s as any)?.totalPaymentDue ?? null,
        customerId: (s as any)?.customer?.['@id'] ?? null,
        snapshot: s,
      } as ListItem;
    });
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
        const idx = state.data.findIndex((it) => it.key === evt.orderId);
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
            const idx2 = state.data.findIndex((it) => it.key === evt.orderId);
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
  // (Defined inline in ordersStore to avoid TDZ concerns.)

  // authed must be declared before ordersStore
  // (moved above)
  const actions: Action[] = $derived([
    {
      id: 'signin',
      label: authed ? 'Signed in' : 'Sign in to view all orders',
      variant: authed ? 'ghost' : 'primary',
      onClick: () => { if (!authed) void ensureAuthed(); },
    },
  ]);

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
      // ordersStore and actions are derived from `authed` and will update automatically
    } catch (e) {
      console.error('[orders] safe sign-in failed:', e);
      authed = false;
      // ordersStore/actions will reflect unauthenticated state automatically
    }
  }

  // Initialize auth state on client only
  if (browser) {
    authed = !!getMarketClient().auth.getAuthMeta();
  }
</script>

<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg"
              contentWidthClass="page page--lg" usePagePadding={true} headerTopGapClass="mt-4 md:mt-6"
              collapsedTopGapClass="mt-3 md:mt-4">
  {#snippet title()}
    <h1 class="h2">My Orders</h1>
  {/snippet}
  {#snippet meta()}
    {authed
      ? 'Orders for the authenticated wallet'
      : 'Sign in to view orders'}
  {/snippet}
  {#snippet headerActions()}
    <ActionButtonBar {actions} />
  {/snippet}
  {#snippet collapsedLeft()}
    <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">Orders</span>
  {/snippet}
  {#snippet collapsedMenu()}
    <ActionButtonDropDown {actions} />
  {/snippet}

  <GenericList store={ordersStore} row={OrderRow} getKey={(it) => it.key} />
</PageScaffold>
