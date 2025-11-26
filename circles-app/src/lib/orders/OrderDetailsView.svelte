<script lang="ts">
  import { formatCurrency } from '$lib/cart/money';
  import type { OrderSnapshot } from '$lib/cart/types';

  interface Props {
    snapshot: OrderSnapshot | null | undefined;
  }
  let { snapshot }: Props = $props();

  function statusLabel(status?: string | null): string | null {
    if (!status) return null;
    try {
      const u = new URL(status);
      return u.pathname.split('/').pop() || status;
    } catch {
      return status;
    }
  }

  function partyId(id?: string | null): string | null {
    if (!id) return null;
    return id;
  }

  function getSchemaId(x: any): string | null {
    try {
      if (x && typeof x === 'object') {
        const v = (x as any)['@id'];
        return typeof v === 'string' ? v : null;
      }
    } catch {}
    return null;
  }

  function priceDisplay(): string | null {
    const p = snapshot?.totalPaymentDue;
    if (!p) return null;
    return formatCurrency(p.price ?? null, p.priceCurrency ?? null);
  }

  // Extract seller @id for a given item index, aligning with acceptedOffer order.
  function sellerIdForIndex(i: number): string | null {
    try {
      const offer = (snapshot as any)?.acceptedOffer?.[i];
      const sellerObj = offer?.seller;
      return getSchemaId(sellerObj);
    } catch {
      return null;
    }
  }
</script>

{#if snapshot}
  <section class="w-full bg-base-100 border rounded-xl shadow-sm overflow-hidden">
    <div class="p-4 md:p-5 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          {#if statusLabel(snapshot.orderStatus)}
            <span class="badge badge-ghost badge-sm">{statusLabel(snapshot.orderStatus)}</span>
          {/if}
          <span class="font-mono text-xs opacity-70 truncate" title={snapshot.orderNumber}>{snapshot.orderNumber}</span>
        </div>
        {#if priceDisplay()}
          <div class="mt-1 text-sm">Total: <span class="font-medium">{priceDisplay()}</span></div>
        {/if}
      </div>
    </div>

    <div class="px-4 md:px-5 pb-4 md:pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-1">
        <div class="text-xs uppercase tracking-wide opacity-60">Customer</div>
        <div class="font-mono text-sm break-all">{partyId(getSchemaId(snapshot.customer))}</div>
      </div>
      <div class="space-y-1">
        <div class="text-xs uppercase tracking-wide opacity-60">Broker</div>
        <div class="font-mono text-sm break-all">{partyId(getSchemaId(snapshot.broker))}</div>
      </div>

      {#if snapshot.shippingAddress}
        <div class="space-y-1">
          <div class="text-xs uppercase tracking-wide opacity-60">Shipping address</div>
          <div class="text-sm leading-snug">
            {snapshot.shippingAddress.streetAddress}
            <br />{snapshot.shippingAddress.postalCode} {snapshot.shippingAddress.addressLocality}
            <br />{snapshot.shippingAddress.addressCountry}
          </div>
        </div>
      {/if}

      {#if snapshot.billingAddress}
        <div class="space-y-1">
          <div class="text-xs uppercase tracking-wide opacity-60">Billing address</div>
          <div class="text-sm leading-snug">
            {snapshot.billingAddress.streetAddress}
            <br />{snapshot.billingAddress.postalCode} {snapshot.billingAddress.addressLocality}
            <br />{snapshot.billingAddress.addressCountry}
          </div>
        </div>
      {/if}
    </div>

    <div class="px-4 md:px-5 py-3 border-t text-xs uppercase tracking-wide opacity-60">Items</div>
    <div class="px-4 md:px-5 pb-4 md:pb-5 flex flex-col gap-2">
      {#each snapshot.orderedItem as line, i (i)}
        <div class="border rounded-lg px-3 py-2 bg-base-200/30">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="font-medium truncate">{line?.orderedItem?.sku ?? 'Item'}</div>
              <div class="text-xs opacity-70">Qty: {line?.orderQuantity ?? 1}</div>
              {#if sellerIdForIndex(i)}
                <div class="font-mono text-[11px] opacity-70 break-all">Seller: {sellerIdForIndex(i)}</div>
              {/if}
              {#if line?.productCid}
                <div class="font-mono text-[11px] opacity-70 break-all">{line.productCid}</div>
              {/if}
            </div>
          </div>
        </div>
      {/each}
      {#if (snapshot.orderedItem ?? []).length === 0}
        <div class="text-sm opacity-70">No items</div>
      {/if}
    </div>
  </section>
{:else}
  <div class="text-sm opacity-70">No order data</div>
{/if}

<style>
</style>
