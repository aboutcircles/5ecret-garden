
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
        <!-- Buyer (me): do NOT show avatar per requirement -->
        <div class="font-mono text-sm break-all">{partyId(getSchemaId(snapshot.customer))}</div>
      </div>
      <div class="space-y-1">
        <div class="text-xs uppercase tracking-wide opacity-60">Broker</div>
        <div class="flex items-center gap-2 min-w-0">
          {#if evmFromEip155(getSchemaId(snapshot.broker))}
            <!-- Small inline avatar before broker address -->
            <Avatar view="small_no_text" address={evmFromEip155(getSchemaId(snapshot.broker))} />
          {/if}
          <span class="font-mono text-sm break-all">{partyId(getSchemaId(snapshot.broker))}</span>
        </div>
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
        <div class="border rounded-lg px-3 py-2 bg-base-200/30 cursor-pointer hover:bg-base-200/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
             role="button" tabindex="0"
             onclick={() => goToOffer(i)}
             onkeydown={(e) => onKeyGoToOffer(e, i)}>
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0">
              <!-- Product thumbnail -->
              {#if resolved[i]?.imageUrl}
                <img src={resolved[i]?.imageUrl || ''}
                     alt={resolved[i]?.name ?? line?.orderedItem?.sku ?? 'Product image'}
                     class="w-12 h-12 rounded-md object-cover flex-shrink-0" />
              {:else}
                <div class="w-12 h-12 rounded-md bg-base-300/50 flex items-center justify-center text-xs text-base-content/50 select-none">
                  Img
                </div>
              {/if}

              <div class="min-w-0">
                <div class="font-medium truncate">{resolved[i]?.name || line?.orderedItem?.name || line?.orderedItem?.sku || 'Item'}</div>
              <div class="text-xs opacity-70">Qty: {line?.orderQuantity ?? 1}</div>
              {#if sellerIdForIndex(i)}
                <div class="flex items-center gap-2">
                  {#if evmFromEip155(sellerIdForIndex(i))}
                    <Avatar view="small_no_text" address={evmFromEip155(sellerIdForIndex(i))} />
                  {/if}
                  <span class="font-mono text-[11px] opacity-70 break-all">Seller: {sellerIdForIndex(i)}</span>
                </div>
              {/if}
              {#if line?.productCid}
                <div class="font-mono text-[11px] opacity-70 break-all">{line.productCid}</div>
              {/if}
              </div>
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

<script lang="ts">
  import { formatCurrency } from '$lib/cart/money';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import type { Address as EvmAddress } from '@circles-sdk/utils';
  import type { OrderSnapshot } from '$lib/cart/types';
  import { onMount } from 'svelte';
  import { fetchProductForSellerAndSku } from '$lib/market/catalogClient';
  import { getProduct, pickProductImageUrl } from '$lib/market/catalogHelpers';
  import { goto } from '$app/navigation';
  import { popupControls } from '$lib/stores/popUp';

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

  // Extract an EVM address from an eip155-style Schema.org @id (e.g. eip155:100:0xabc...)
  function evmFromEip155(id: string | null | undefined): EvmAddress | undefined {
    if (!id || typeof id !== 'string') return null as any;
    const parts = id.split(':');
    if (parts.length >= 3) {
      const addr = parts[2];
      if (/^0x[a-fA-F0-9]{40}$/.test(addr)) return addr as unknown as EvmAddress;
    }
    return undefined;
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

  // Resolve product name and image per line item using seller + sku
  type ResolvedLine = { name?: string | null; imageUrl?: string | null } | null;
  let resolved: Record<number, ResolvedLine> = $state({});

  function skuForIndex(i: number): string | null {
    try {
      const sku = (snapshot as any)?.orderedItem?.[i]?.orderedItem?.sku;
      return typeof sku === 'string' && sku ? sku : null;
    } catch {
      return null;
    }
  }

  async function resolveLine(i: number) {
    try {
      const sid = sellerIdForIndex(i);
      const sku = skuForIndex(i);
      const evm = evmFromEip155(sid ?? undefined);
      if (!evm || !sku) {
        resolved[i] = { name: null, imageUrl: null };
        return;
      }
      const prod = await fetchProductForSellerAndSku(evm as unknown as string, sku);
      if (!prod) {
        resolved[i] = { name: null, imageUrl: null };
        return;
      }
      const p = getProduct(prod);
      const name = (p as any)?.name ?? null;
      const imageUrl = pickProductImageUrl(p);
      resolved[i] = { name, imageUrl };
    } catch (e) {
      // Swallow errors; leave fallback to SKU
      resolved[i] = { name: null, imageUrl: null };
    }
  }

  let mounted = $state(false);
  onMount(() => { mounted = true; });

  $effect(() => {
    if (!mounted || !snapshot) return;
    const items = (snapshot as any)?.orderedItem ?? [];
    // Keep existing resolutions when possible; only resolve missing ones
    items.forEach((_: any, idx: number) => {
      if (!resolved[idx]) {
        // Fire and forget; state updates when finished
        resolveLine(idx);
      }
    });
  });

  // Navigate to offer detail page for a given order line
  function goToOffer(i: number) {
    const sid = sellerIdForIndex(i);
    const sku = skuForIndex(i);
    const seller = evmFromEip155(sid ?? undefined);
    if (!seller || !sku) return;
    // Close popup if open, then navigate
    try { popupControls.close(); } catch {}
    goto(`/market/${encodeURIComponent(String(seller))}/${encodeURIComponent(String(sku))}`);
  }

  function onKeyGoToOffer(e: KeyboardEvent, i: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToOffer(i);
    }
  }
</script>