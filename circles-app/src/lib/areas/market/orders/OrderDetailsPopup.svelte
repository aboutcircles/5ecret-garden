<script lang="ts">
  import OrderDetailsView from '$lib/areas/market/orders/OrderDetailsView.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { getOrderStatusHistory, subscribeBuyerOrderEvents, getOrder } from '$lib/areas/market/orders/ordersQueries';
  import type { OrderStatusChange, FullOrderSnapshot, SellerOrderDto } from '$lib/areas/market/orders/types';
  import { createLoadable } from '$lib/areas/market/utils/loadable';
  import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';

  // Security: Do NOT accept or render order keys in the UI. Instead, this popup
  // expects a full snapshot to be provided by the caller (e.g., from an
  // authenticated listing).

  interface Props {
    mode: 'buyer' | 'seller';
    orderId?: string;
    snapshot?: FullOrderSnapshot | null;
    showHistory?: boolean;
    showAdvanced?: boolean;
  }

  let {
    mode,
    orderId,
    snapshot,
    showHistory = true,
    showAdvanced = true,
  }: Props = $props();

  const sellerLoader = createLoadable<FullOrderSnapshot | null>(null);
  const sellerLoading = $derived($sellerLoader.loading);
  const sellerError = $derived($sellerLoader.error || '');

  function arrayify<T>(x: T | T[] | null | undefined): T[] {
    if (!x) return [];
    return Array.isArray(x) ? x : [x];
  }

  function normalizeSnapshot(x: SellerOrderDto | FullOrderSnapshot | null | undefined): FullOrderSnapshot | null {
    if (!x || typeof x !== 'object') return null;
    return {
      ...x,
      orderedItem: arrayify(x.orderedItem),
      acceptedOffer: arrayify(x.acceptedOffer),
      outbox: arrayify(x.outbox),
    } as FullOrderSnapshot;
  }

  const jsonText: string = $derived.by(() => JSON.stringify(snapshot ?? {}, null, 2));

  let statusEvents: OrderStatusChange[] = $state([]);
  let loadingHistory: boolean = $state(false);
  let historyError: string | null = $state(null);

  let stopSse: (() => void) | null = null;
  const seenKeys = new Set<string>();
  const isAuthHistoryError = $derived.by(() => {
    const msg = (historyError ?? '').toLowerCase();
    return msg.includes('auth') || msg.includes('401') || msg.includes('unauthor');
  });


  async function loadSellerOrder(): Promise<void> {
    if (!orderId || typeof orderId !== 'string') return;
    await sellerLoader.run(async () => {
      const market = getMarketClient();
      const res = await market.sales.get(orderId as string & { readonly __brand: 'OrderId' });
      if (!res) throw new Error('Order not found or not associated with your seller account');
      return normalizeSnapshot(res);
    });
    if ($sellerLoader.value) {
      snapshot = $sellerLoader.value;
    }
  }

  onMount(async () => {
    if (mode === 'seller') {
      await loadSellerOrder();
      return;
    }

    if (!showHistory) return;
    try {
      const buyerOrderId = snapshot?.orderNumber;
      if (!buyerOrderId || typeof buyerOrderId !== 'string') return;
      loadingHistory = true;
      const history = await getOrderStatusHistory(buyerOrderId);
      statusEvents = history?.events ?? [];
      // seed de-dup set
      for (const ev of statusEvents) {
        if (!ev?.newStatus || !ev?.changedAt) continue;
        seenKeys.add(`${buyerOrderId}|${ev.newStatus}|${ev.changedAt}`);
      }
      historyError = null;

      // Subscribe to live SSE events for this buyer; filter this order
      stopSse = subscribeBuyerOrderEvents(async (evt) => {
        if (!evt || evt.orderId !== buyerOrderId || !evt.newStatus || !evt.changedAt) return;
        const key = `${evt.orderId}|${evt.newStatus}|${evt.changedAt}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        statusEvents = [...statusEvents, { oldStatus: evt.oldStatus ?? null, newStatus: evt.newStatus, changedAt: evt.changedAt }];
        if (evt.newStatus === 'https://schema.org/PaymentComplete' || evt.newStatus === 'https://schema.org/OrderDelivered') {
          try {
            const fresh = await getOrder(buyerOrderId);
            snapshot = fresh;
          } catch (e) {
            console.debug('[orders] live refresh failed', { orderId: buyerOrderId }, e);
          }
        }
      });
    } catch (e: any) {
      historyError = String(e?.message ?? e);
      statusEvents = [];
    } finally {
      loadingHistory = false;
    }
  });

  onDestroy(() => {
    try {
      stopSse?.();
    } catch (e) {
      console.debug('[orders] stop SSE failed', e);
    }
    stopSse = null;
  });
</script>

<div class="flex flex-col gap-3 w-full max-w-[min(92vw,52rem)]">
  {#if mode === 'seller' && sellerLoading}
    <div class="flex items-center gap-2 text-base-content/70 py-6">
      <span class="loading loading-spinner text-primary"></span>
      <span>Loading order…</span>
    </div>
  {:else if mode === 'seller' && sellerError}
    <div class="alert alert-warning">
      <span>{sellerError}</span>
    </div>
  {:else}
    <OrderDetailsView {snapshot} {statusEvents} />
  {/if}

  {#if showHistory && historyError}
    {#if isAuthHistoryError}
      <div class="alert alert-warning mt-1 text-sm">
        <span>Sign in to view order status history.</span>
        <a class="btn btn-xs btn-primary" href="/settings?tab=orders">Sign in</a>
      </div>
    {:else}
      <div class="text-xs text-error mt-1">Failed to load status history: {historyError}</div>
    {/if}
  {/if}

  {#if showAdvanced}
    <details class="mt-2">
      <summary class="cursor-pointer text-sm opacity-70 hover:opacity-100">Advanced details</summary>
      <div class="bg-base-100 border rounded-xl shadow-sm overflow-hidden mt-2">
        <pre class="m-0 p-4 text-xs overflow-auto"><code>{jsonText}</code></pre>
      </div>
    </details>
  {/if}
</div>
