<script lang="ts">
  import OrderDetailsView from '$lib/areas/market/orders/OrderDetailsView.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { getOrderStatusHistory, subscribeBuyerOrderEvents, getOrder } from '$lib/areas/market/orders/ordersQueries';
  import type { OrderStatusChange } from '$lib/areas/market/orders/types';

  // Security: Do NOT accept or render order keys in the UI. Instead, this popup
  // expects a full snapshot to be provided by the caller (e.g., from an
  // authenticated listing).

  interface Props { snapshot: any }
  let { snapshot }: Props = $props();

  let jsonText: string = $state(JSON.stringify(snapshot ?? {}, null, 2));

  let statusEvents: OrderStatusChange[] = $state([]);
  let loadingHistory: boolean = $state(false);
  let historyError: string | null = $state(null);

  let stopSse: (() => void) | null = null;
  const seenKeys = new Set<string>();


  onMount(async () => {
    try {
      const orderId = snapshot?.orderNumber;
      if (!orderId || typeof orderId !== 'string') return;
      loadingHistory = true;
      const history = await getOrderStatusHistory(orderId);
      statusEvents = history?.events ?? [];
      // seed de-dup set
      for (const ev of statusEvents) {
        if (!ev?.newStatus || !ev?.changedAt) continue;
        seenKeys.add(`${orderId}|${ev.newStatus}|${ev.changedAt}`);
      }
      historyError = null;

      // Subscribe to live SSE events for this buyer; filter this order
      stopSse = subscribeBuyerOrderEvents(async (evt) => {
        if (!evt || evt.orderId !== orderId || !evt.newStatus || !evt.changedAt) return;
        const key = `${evt.orderId}|${evt.newStatus}|${evt.changedAt}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        statusEvents = [...statusEvents, { oldStatus: evt.oldStatus ?? null, newStatus: evt.newStatus, changedAt: evt.changedAt }];
        if (evt.newStatus === 'https://schema.org/PaymentComplete' || evt.newStatus === 'https://schema.org/OrderDelivered') {
          try {
            const fresh = await getOrder(orderId);
            snapshot = fresh;
            jsonText = JSON.stringify(fresh ?? {}, null, 2);
          } catch {
            // ignore
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

  onDestroy(() => { try { stopSse?.(); } catch {}; stopSse = null; });
</script>

<div class="flex flex-col gap-3 w-full max-w-[min(92vw,52rem)]">
  <OrderDetailsView {snapshot} {statusEvents} />

  {#if historyError}
    <div class="text-xs text-error mt-1">Failed to load status history: {historyError}</div>
  {/if}

  <details class="mt-2">
    <summary class="cursor-pointer text-sm opacity-70 hover:opacity-100">View raw JSON</summary>
    <div class="bg-base-100 border rounded-xl shadow-sm overflow-hidden mt-2">
      <pre class="m-0 p-4 text-xs overflow-auto"><code>{jsonText}</code></pre>
    </div>
  </details>
</div>
