<script lang="ts">
  import OrderDetailsView from '$lib/areas/market/orders/OrderDetailsView.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { getOrderStatusHistory, subscribeBuyerOrderEvents, getOrder } from '$lib/areas/market/orders/ordersQueries';
  import type { OrderStatusChange } from '$lib/areas/market/orders/types';
  import { createLoadable } from '$lib/areas/market/utils/loadable';
  import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
  import { T } from '$lib/design-system/tokens.js';

  // Security: Do NOT accept or render order keys in the UI. Instead, this popup
  // expects a full snapshot to be provided by the caller (e.g., from an
  // authenticated listing).

  interface Props {
    mode: 'buyer' | 'seller';
    orderId?: string;
    snapshot?: any;
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

  type SellerOrderDto = any;
  const sellerLoader = createLoadable<SellerOrderDto | null>(null);
  const sellerLoading = $derived($sellerLoader.loading);
  const sellerError = $derived($sellerLoader.error || '');

  function arrayify<T>(x: T | T[] | null | undefined): T[] {
    if (!x) return [];
    return Array.isArray(x) ? x : [x];
  }

  function normalizeSnapshot(x: any): any {
    if (!x || typeof x !== 'object') return x;
    const out: any = { ...x };
    out.orderedItem = arrayify(out.orderedItem);
    out.acceptedOffer = arrayify(out.acceptedOffer);
    out.outbox = arrayify(out.outbox);
    return out;
  }

  const jsonText: string = $derived.by(() => JSON.stringify(snapshot ?? {}, null, 2));

  let statusEvents: OrderStatusChange[] = $state([]);
  let loadingHistory: boolean = $state(false);
  let historyError: string | null = $state(null);

  let stopSse: (() => void) | null = null;
  let destroyed = false;
  const seenKeys = new Set<string>();
  const isAuthHistoryError = $derived.by(() => {
    const msg = (historyError ?? '').toLowerCase();
    return msg.includes('auth') || msg.includes('401') || msg.includes('unauthor');
  });


  async function loadSellerOrder(): Promise<void> {
    if (!orderId || typeof orderId !== 'string') return;
    await sellerLoader.run(async () => {
      const market = getMarketClient();
      const res = await market.sales.get(orderId as any);
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
      if (destroyed) return;
      statusEvents = history?.events ?? [];
      // seed de-dup set
      for (const ev of statusEvents) {
        if (!ev?.newStatus || !ev?.changedAt) continue;
        seenKeys.add(`${buyerOrderId}|${ev.newStatus}|${ev.changedAt}`);
      }
      historyError = null;

      // Subscribe to live SSE events for this buyer; filter this order
      const unsubscribe = subscribeBuyerOrderEvents(async (evt) => {
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
      if (destroyed) {
        try {
          unsubscribe();
        } catch (e) {
          console.debug('[orders] stop SSE failed after destroy', e);
        }
        return;
      }
      stopSse = unsubscribe;
    } catch (e: any) {
      if (destroyed) return;
      historyError = String(e?.message ?? e);
      statusEvents = [];
    } finally {
      if (destroyed) return;
      loadingHistory = false;
    }
  });

  onDestroy(() => {
    destroyed = true;
    try {
      stopSse?.();
    } catch (e) {
      console.debug('[orders] stop SSE failed', e);
    }
    stopSse = null;
  });
</script>

<div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:min(92vw,52rem);">
  {#if mode === 'seller' && sellerLoading}
    <div style="display:flex;align-items:center;gap:10px;color:{T.inkMuted};padding:24px 0;">
      <span class="loading loading-spinner" style="color:{T.primary};"></span>
      <span style="font-size:13px;">Loading order…</span>
    </div>
  {:else if mode === 'seller' && sellerError}
    <div style="background:{T.warningSoft};border:1px solid rgba(176,112,20,0.2);border-radius:12px;padding:12px 14px;font-size:12.5px;color:{T.inkBody};">
      {sellerError}
    </div>
  {:else}
    <OrderDetailsView {snapshot} {statusEvents} />
  {/if}

  {#if showHistory && historyError}
    {#if isAuthHistoryError}
      <div style="
        background:{T.warningSoft};border:1px solid rgba(176,112,20,0.2);border-radius:12px;
        padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;
        font-size:12.5px;color:{T.inkBody};
      ">
        <span>Sign in to view order status history.</span>
        <a
          href="/settings?tab=orders"
          style="
            display:inline-flex;align-items:center;
            height:28px;padding:0 12px;border-radius:9999px;
            background:{T.primary};color:#fff;
            font-size:11.5px;font-weight:540;text-decoration:none;
          "
        >Sign in</a>
      </div>
    {:else}
      <div style="font-size:11.5px;color:{T.negative};">Failed to load status history: {historyError}</div>
    {/if}
  {/if}

  {#if showAdvanced}
    <details style="margin-top:4px;">
      <summary style="cursor:pointer;font-size:11.5px;color:{T.inkMuted};font-weight:540;letter-spacing:0.02em;list-style:none;padding:6px 0;">
        Advanced details
      </summary>
      <div style="background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:12px;overflow:hidden;margin-top:6px;">
        <pre style="margin:0;padding:14px;font-family:{T.fontMono};font-size:11px;color:{T.ink};overflow:auto;line-height:1.5;"><code>{jsonText}</code></pre>
      </div>
    </details>
  {/if}
</div>
