
{#if snapshot}
  <section class="w-full bg-base-100 border rounded-xl shadow-sm overflow-hidden">
    <div class="p-4 md:p-5 flex items-start justify-between gap-4">
      <!-- Left: status + order meta -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span class="font-mono text-xs opacity-70 truncate" title={snapshot.orderNumber}>{snapshot.orderNumber}</span>
          {#if statusLabel(snapshot.orderStatus)}
            <span class="badge badge-sm {statusClass(snapshot.orderStatus)}">{statusLabel(snapshot.orderStatus)}</span>
          {/if}
        </div>
        <div class="mt-1 text-xs opacity-70">
          {#if orderDate()}
            {formatTimestamp(orderDate())}
          {/if}
        </div>
      </div>
      <!-- Right: prominent total amount like an invoice -->
      {#if priceDisplay()}
        <div class="shrink-0 bg-base-200/60 rounded-lg px-4 py-3 text-right">
          <div class="text-[10px] uppercase tracking-wide opacity-60">Total</div>
          <div class="text-xl font-semibold leading-none">{priceDisplay()}</div>
        </div>
      {/if}
    </div>

    <div class="px-4 md:px-5 pb-4 md:pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-1">
        <div class="text-xs uppercase tracking-wide opacity-60">Customer</div>
        {#if evmFromEip155(getSchemaId(snapshot.customer))}
          <Avatar
            view="horizontal"
            address={evmFromEip155(getSchemaId(snapshot.customer))}
            bottomInfo={String(evmFromEip155(getSchemaId(snapshot.customer)))}
          />
        {:else}
          <div class="font-mono text-sm break-all">{partyId(getSchemaId(snapshot.customer))}</div>
        {/if}
      </div>
      <div class="space-y-1">
        <div class="text-xs uppercase tracking-wide opacity-60">Broker</div>
        {#if evmFromEip155(getSchemaId(snapshot.broker))}
          <Avatar
            view="horizontal"
            address={evmFromEip155(getSchemaId(snapshot.broker))}
            bottomInfo={String(evmFromEip155(getSchemaId(snapshot.broker)))}
          />
        {:else}
          <div class="font-mono text-sm break-all">{partyId(getSchemaId(snapshot.broker))}</div>
        {/if}
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
    <!-- Simple header row to evoke an invoice table -->
    <div class="px-4 md:px-5 text-[11px] uppercase tracking-wide opacity-60 hidden sm:flex">
      <div class="flex-1">Description</div>
      <div class="w-20 text-center">Qty</div>
      <div class="w-40">Seller</div>
    </div>
    <div class="px-4 md:px-5 pb-4 md:pb-5 flex flex-col gap-2">
      {#each snapshot.orderedItem as line, i (i)}
        <div class="border rounded-lg px-3 py-2 bg-base-200/30 cursor-pointer hover:bg-base-200/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
             role="button" tabindex="0"
             onclick={() => goToOffer(i)}
             onkeydown={(e) => onKeyGoToOffer(e, i)}>
          <div class="sm:grid sm:grid-cols-[1fr,5rem,12rem] sm:items-center sm:gap-3 flex items-start justify-between gap-3">
            <!-- Left column: thumbnail + title; on mobile also shows qty + seller -->
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
                <!-- Mobile-only meta: qty and seller under description -->
                <div class="sm:hidden text-xs opacity-70">Qty: {line?.orderQuantity ?? 1}</div>
                {#if sellerIdForIndex(i)}
                  <div class="sm:hidden">
                    {#if evmFromEip155(sellerIdForIndex(i))}
                      <div class="mt-1 flex items-center gap-2">
                        <Avatar view="small_no_text" address={evmFromEip155(sellerIdForIndex(i))} />
                        <div class="text-xs opacity-70">
                          <span class="uppercase opacity-60">Seller</span>
                          <span class="font-mono ml-1">{shortAddr(evmFromEip155(sellerIdForIndex(i)))}</span>
                        </div>
                      </div>
                    {:else}
                      <div class="text-[11px] opacity-70 break-all">Seller: {sellerIdForIndex(i)}</div>
                    {/if}
                  </div>
                {/if}
                {#if line?.productCid}
                  <div class="font-mono text-[11px] opacity-70 break-all">{line.productCid}</div>
                {/if}
              </div>
            </div>

            <!-- Middle column (sm+): quantity -->
            <div class="hidden sm:flex items-center justify-center text-sm opacity-80">{line?.orderQuantity ?? 1}</div>

            <!-- Right column (sm+): seller -->
            <div class="hidden sm:flex items-center gap-2">
              {#if sellerIdForIndex(i)}
                {#if evmFromEip155(sellerIdForIndex(i))}
                  <Avatar view="small_no_text" address={evmFromEip155(sellerIdForIndex(i))} />
                  <div class="text-xs opacity-70">
                    <span class="uppercase opacity-60">Seller</span>
                    <span class="font-mono ml-1">{shortAddr(evmFromEip155(sellerIdForIndex(i)))}</span>
                  </div>
                {:else}
                  <div class="text-[11px] opacity-70 break-all">{sellerIdForIndex(i)}</div>
                {/if}
              {/if}
            </div>
          </div>
        </div>
      {/each}
      {#if (snapshot.orderedItem ?? []).length === 0}
        <div class="text-sm opacity-70">No items</div>
      {/if}
    </div>

    <div class="px-4 md:px-5 pt-3 border-t text-xs uppercase tracking-wide opacity-60">
      Status history
    </div>
    <div class="px-4 md:px-5 pb-3 flex flex-col gap-1.5 text-sm">
      {#if timeline.length === 0}
        <div class="text-xs opacity-70">No status changes recorded.</div>
      {:else}
        {#each timeline as evt, idx}
          <div class="flex items-start gap-2">
            <div class="mt-1 w-2 h-2 rounded-full {idx === timeline.length - 1 ? 'bg-primary' : 'bg-base-300'}"></div>
            <div class="flex flex-col">
              <div class="font-medium">
                {statusLabel(evt.status) ?? evt.status}
              </div>
              <div class="text-xs opacity-70">
                {formatTimestamp(evt.changedAt)}
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    {#if snapshot?.outbox && snapshot.outbox.length > 0}
      <div class="px-4 md:px-5 pt-3 border-t text-xs uppercase tracking-wide opacity-60">
        Fulfillment / outbox
      </div>
      <div class="px-4 md:px-5 pb-3 flex flex-col gap-2 text-sm">
        {#each snapshot.outbox as item}
          <div class="border rounded-lg bg-base-100/60 p-2 space-y-1">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="badge badge-ghost badge-xs">
                  {outboxLabel(item.payload)}
                </span>
                {#if item.source}
                  <span class="text-[11px] opacity-60">{item.source}</span>
                {/if}
              </div>
              <span class="text-[11px] opacity-60">
                {formatTimestamp(item.createdAt)}
              </span>
            </div>

            {@render OutboxPayloadView({ payload: item.payload })}
          </div>
        {/each}
      </div>
    {/if}
  </section>
{:else}
  <div class="text-sm opacity-70">No order data</div>
{/if}

{#snippet OutboxPayloadView({ payload })}
  {#if isKnownDownloadPayload(payload)}
    <div class="flex items-center gap-2">
      <a
        class="btn btn-xs btn-primary"
        href={payload.downloadUrl || payload.contentUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Download
      </a>
      {#if payload.expiresAt}
        <span class="text-[11px] opacity-70">
          Expires: {formatTimestamp(payload.expiresAt)}
        </span>
      {/if}
    </div>
  {:else if isVoucherPayload(payload)}
    <div class="text-xs">
      Voucher code:
      <code>{payload.code}</code>
    </div>
  {:else}
    <pre class="text-[11px] bg-base-200/80 rounded-md p-2 overflow-auto">
      {JSON.stringify(payload, null, 2)}
    </pre>
  {/if}
{/snippet}

<style>
</style>

<script lang="ts">
  import { formatCurrency } from '$lib/cart/money';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import type { Address as EvmAddress } from '@circles-sdk/utils';
  import type { OrderSnapshot } from '$lib/cart/types';
  import type { OrderStatusEvent } from '$lib/cart/client';
  import { formatTimestamp, statusLabel } from '$lib/cart/status';
  import { onMount } from 'svelte';
  import { fetchProductForSellerAndSku } from '$lib/market/catalogClient';
  import { getProduct, pickProductImageUrl } from '$lib/market/catalogHelpers';
  import { popupControls, type PopupContentDefinition } from '$lib/stores/popUp';
  import ProductDetailsPopup from '$lib/market/ProductDetailsPopup.svelte';

  interface Props {
    snapshot: OrderSnapshot | null | undefined;
    statusEvents?: OrderStatusEvent[] | null;
  }
  let { snapshot, statusEvents = null }: Props = $props();


  type TimelineEvent = { status: string; changedAt: string };
  let timeline: TimelineEvent[] = $state([]);

  $effect(() => {
    if (!snapshot) {
      timeline = [];
      return;
    }

    const events: TimelineEvent[] = [];

    // Build timeline from history, inferring the initial creation status from the
    // first entry's oldStatus instead of using the current snapshot status.
    const history = Array.isArray(statusEvents)
      ? statusEvents
          .filter((ev) => ev && typeof ev.newStatus === 'string' && typeof ev.changedAt === 'string')
          .slice()
          .sort((a, b) => String(a.changedAt).localeCompare(String(b.changedAt)))
      : [];

    if (history.length > 0) {
      const first = history[0];
      const initialStatus = (first.oldStatus && String(first.oldStatus)) || null;
      const initialTime = (snapshot as any)?.orderDate ?? first.changedAt;
      if (initialStatus) {
        events.push({ status: initialStatus, changedAt: String(initialTime) });
      }
      for (const ev of history) {
        events.push({ status: ev.newStatus, changedAt: ev.changedAt });
      }
    } else {
      // No history available — fall back to a single entry using the snapshot info.
      if ((snapshot as any)?.orderStatus && (snapshot as any)?.orderDate) {
        events.push({
          status: (snapshot as any).orderStatus,
          changedAt: (snapshot as any).orderDate,
        });
      }
    }

    // Ensure chronological order.
    timeline = events.sort((a, b) => a.changedAt.localeCompare(b.changedAt));
  });


  function partyId(id?: string | null): string | null {
    if (!id) return null;
    return id;
  }

  function outboxLabel(payload: any): string {
    try {
      const t = payload && typeof payload === 'object' ? payload['@type'] : null;
      if (typeof t === 'string' && t.length > 0) {
        const parts = t.split(/[\/#]/);
        return parts[parts.length - 1] || 'Outbox item';
      }
    } catch {}
    return 'Outbox item';
  }

  function isKnownDownloadPayload(payload: any): boolean {
    try {
      const t = payload?.['@type'];
      const hasUrl = typeof payload?.downloadUrl === 'string' || typeof payload?.contentUrl === 'string';
      return typeof t === 'string' && hasUrl;
    } catch {
      return false;
    }
  }

  function isVoucherPayload(payload: any): boolean {
    try {
      const t = payload?.['@type'];
      return typeof t === 'string' && t.toLowerCase().includes('voucher') && typeof payload?.code === 'string';
    } catch {
      return false;
    }
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
  
  // Shorten an EVM address like 0x1234...ABCD
  function shortAddr(addr?: EvmAddress | string | null): string {
    const a = typeof addr === 'string' ? addr : (addr as any) ?? '';
    if (!a || a.length < 10) return String(a || '');
    return a.slice(0, 6) + '...' + a.slice(-4);
  }
  
  // Map status to contextual badge colors
  function statusClass(status: any): string {
    try {
      const s = String(status || '').toLowerCase();
      if (s.includes('paymentcomplete') || s.endsWith('#PaymentComplete'.toLowerCase())) return 'badge-success';
      if (s.includes('paymentprocessing')) return 'badge-info';
      if (s.includes('orderpaymentdue') || s.includes('paymentdue')) return 'badge-warning';
      if (s.includes('ordercancelled') || s.includes('canceled') || s.includes('cancelled')) return 'badge-error';
    } catch {}
    return 'badge-ghost';
  }
  
  function orderDate(): string | null {
    try {
      const d = (snapshot as any)?.orderDate;
      return typeof d === 'string' ? d : null;
    } catch {
      return null;
    }
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

  // Open offer detail in a popup for a given order line
  function goToOffer(i: number) {
    const sid = sellerIdForIndex(i);
    const sku = skuForIndex(i);
    const seller = evmFromEip155(sid ?? undefined);
    if (!seller || !sku) return;
    const def: PopupContentDefinition = {
      title: 'Product details',
      component: ProductDetailsPopup,
      props: { seller: String(seller), sku: String(sku) },
    };
    popupControls.open(def);
  }

  function onKeyGoToOffer(e: KeyboardEvent, i: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToOffer(i);
    }
  }
</script>