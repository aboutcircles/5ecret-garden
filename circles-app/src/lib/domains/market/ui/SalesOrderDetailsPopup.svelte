<script lang="ts">
  import OrderDetailsView from '$lib/orders/OrderDetailsView.svelte';
  import { createLoadable } from '$lib/utils/loadable';
  import { onMount } from 'svelte';
  import { getMarketClient } from '$lib/integrations/market';

  interface Props {
    orderId: string;
  }
  let { orderId }: Props = $props();

  type SellerOrderDto = any;

  const loader = createLoadable<SellerOrderDto | null>(null);
  const loading = $derived($loader.loading);
  const error = $derived($loader.error || '');
  const dto: SellerOrderDto | null = $derived($loader.value);

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
    // Keep orderNumber, orderDate, orderStatus, totalPaymentDue, shippingAddress, billingAddress, customer, broker
    return out;
  }

  async function load(): Promise<void> {
    await loader.run(async () => {
      const market = getMarketClient();
      const res = await market.sales.get(orderId as any);
      if (!res) throw new Error('Order not found or not associated with your seller account');
      return normalizeSnapshot(res);
    });
  }

  onMount(load);
</script>

<div class="flex flex-col gap-3 w-full max-w-[min(92vw,52rem)]">
  {#if loading}
    <div class="flex items-center gap-2 text-base-content/70 py-6">
      <span class="loading loading-spinner text-primary"></span>
      <span>Loading order…</span>
    </div>
  {:else if error}
    <div class="alert alert-warning">
      <span>{error}</span>
    </div>
  {:else if dto}
    <OrderDetailsView snapshot={dto} />
  {:else}
    <div class="text-sm opacity-70">Order not available.</div>
  {/if}
</div>
