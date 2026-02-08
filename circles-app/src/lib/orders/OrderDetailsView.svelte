
{#if snapshot}
  <section class="w-full bg-base-100 border rounded-xl shadow-sm overflow-hidden">
    <div class="p-4 md:p-5 flex items-start justify-between gap-4">
      <!-- Left: status + order meta -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span class="font-mono text-xs opacity-70 truncate" title={snapshot.orderNumber}>{snapshot.orderNumber}</span>
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
    <div class="px-4 md:px-5 pb-4 md:pb-5 flex flex-col gap-3">
      {#each sellerGroups as grp, gi (gi)}
        <!-- Seller header -->
        <div class="border rounded-lg overflow-hidden bg-base-100/80 shadow-sm">
          <div class="px-3 py-2 border-b bg-base-200/60 flex items-center justify-between">
            <div class="min-w-0">
              {#if grp.evm}
                <Avatar view="horizontal" address={grp.evm} bottomInfo={shortAddr(grp.evm)} />
              {:else}
                <div class="text-xs uppercase tracking-wide opacity-60">Seller</div>
                <div class="font-mono text-sm break-all">{grp.sellerId ?? 'Unknown'}</div>
              {/if}
            </div>
            <div class="shrink-0 text-[11px] opacity-60">{grp.indices.length} item{grp.indices.length === 1 ? '' : 's'}</div>
          </div>

          <!-- Lines for this seller -->
          <div class="divide-y divide-base-200">
            {#each grp.indices as i}
              <div class="px-3 py-2 bg-base-200/20 cursor-pointer hover:bg-base-200/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                   role="button" tabindex="0"
                   onclick={() => goToOffer(i)}
                   onkeydown={(e) => onKeyGoToOffer(e, i)}>
                <div class="flex items-start justify-between gap-3">
                  <!-- Left: thumbnail + title -->
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-14 h-14 rounded bg-base-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {#if resolved[i]?.imageUrl}
                        <img src={resolved[i]?.imageUrl || ''}
                             alt={resolved[i]?.name ?? lineAt(i)?.orderedItem?.sku ?? 'Product image'}
                             class="w-14 h-14 object-cover" />
                      {:else}
                        <span class="text-[10px] opacity-60">No image</span>
                      {/if}
                    </div>

                    <div class="min-w-0">
                      <div class="font-semibold truncate">{resolved[i]?.name || lineAt(i)?.orderedItem?.name || lineAt(i)?.orderedItem?.sku || 'Item'}</div>
                      <div class="text-xs opacity-70 mt-0.5">Qty: {lineAt(i)?.orderQuantity ?? 1}</div>
                      {#if lineAt(i)?.productCid}
                        <div class="font-mono text-[11px] opacity-70 break-all">{lineAt(i)?.productCid}</div>
                      {/if}
                    </div>
                  </div>

                  <!-- Right: prices -->
                  <div class="text-right shrink-0">
                    {#if unitPrice(i).amount != null}
                      <div class="text-xs opacity-70">{formatCurrency(unitPrice(i).amount, unitPrice(i).code)} each</div>
                    {/if}
                    <div class="font-semibold">
                      {#if lineTotal(i).amount != null}
                        {formatCurrency(lineTotal(i).amount, lineTotal(i).code)}
                      {:else}
                        —
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            {/each}
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
        Messages
      </div>
      <div class="px-4 md:px-5 pb-3 flex flex-col gap-2 text-sm">
        {#each snapshot.outbox as item}
          <div class="border rounded-lg bg-base-100/60 p-2 space-y-1">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                {#if !isMessagePayload(item.payload)}
                  <span class={`badge badge-xs ${badgeForOutbox(item.payload)}`}>
                    {outboxLabel(item.payload)}
                  </span>
                {/if}
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
      <JumpLink
        className="btn btn-xs btn-primary"
        url={payload.downloadUrl || payload.contentUrl}
      >
        Download
      </JumpLink>
      {#if payload.expiresAt}
        <span class="text-[11px] opacity-70">
          Expires: {formatTimestamp(payload.expiresAt)}
        </span>
      {/if}
    </div>
  {:else if isVoucherPayload(payload)}
    <div class="text-xs flex items-start gap-2">
      <span class="opacity-70 shrink-0 mt-0.5">Codes:</span>
      <ul class="m-0 p-0 list-none space-y-1.5">
        {#each voucherCodes(payload) as c}
          <li class="max-w-full">
            <code class="font-mono text-[11px] break-all inline-block max-w-full px-1.5 py-1 bg-base-200/80 border border-base-300 rounded">{c}</code>
          </li>
        {/each}
      </ul>
    </div>
  {:else if isMessagePayload(payload)}
    <div class="flex flex-col gap-1.5">
      <div class="text-sm font-semibold">
        {messageSubject(payload)}
      </div>
      {#if payload.text}
        <div class="text-sm leading-relaxed whitespace-pre-line opacity-90">{payload.text}</div>
      {/if}
    </div>
  {:else}
    <pre class="text-[11px] bg-base-200/80 rounded-md p-2 overflow-auto">{JSON.stringify(payload, null, 2)}</pre>
  {/if}
{/snippet}

<style>
</style>

<script lang="ts">
  import { formatCurrency } from '$lib/utils/money';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import JumpLink from '$lib/components/jump/JumpLink.svelte';
  import type { Address as EvmAddress } from '@circles-sdk/utils';
  import type { OrderSnapshot } from '$lib/orders/types';
  import type { OrderStatusChange } from '$lib/orders/types';
  import { formatTimestamp, statusLabel } from '$lib/orders/status';
  import { onMount } from 'svelte';
  import { getProduct, pickProductImageUrl } from '$lib/domains/market/services/catalogHelpers';
  import { getMarketClient } from '$lib/sdk/marketClient';
  import { popupControls, type PopupContentDefinition } from '$lib/shared/state/popup';
  import ProductDetailsPopup from '$lib/domains/market/ui/ProductDetailsPopup.svelte';
  import {gnosisConfig} from "$lib/circlesConfig";

  interface Props {
    snapshot: OrderSnapshot | null | undefined;
    statusEvents?: OrderStatusChange[] | null;
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
      const t = (payload && typeof payload === 'object')
        ? (payload['@type'] || payload['type'])
        : null;
      if (typeof t === 'string' && t.length > 0) {
        const parts = t.split(/[\/#]/);
        return parts[parts.length - 1] || 'Outbox item';
      }
    } catch {}
    return 'Outbox item';
  }

  function isKnownDownloadPayload(payload: any): boolean {
    // try {
    //   const t = payload?.['@type'];
    //   const hasUrl = typeof payload?.downloadUrl === 'string' || typeof payload?.contentUrl === 'string';
    //   return typeof t === 'string' && hasUrl;
    // } catch {
      return false;
    // }
  }

  function isVoucherPayload(payload: any): boolean {
    try {
      const t = (payload?.['@type'] ?? '').toString().toLowerCase();
      const hasType = t.includes('voucher') || t.includes('codedispenserresult');
      const hasSingle = typeof payload?.code === 'string' && payload.code.length > 0;
      const codes = Array.isArray(payload?.codes) ? payload.codes.filter((x: any) => typeof x === 'string' && x.length > 0) : [];
      const hasMany = codes.length > 0;
      return hasType && (hasSingle || hasMany);
    } catch {
      return false;
    }
  }

  function voucherCodes(payload: any): string[] {
    try {
      const arr = Array.isArray(payload?.codes) ? payload.codes : [];
      const codes = arr.filter((x: any) => typeof x === 'string' && x.length > 0);
      const single = (payload?.code ?? '').toString();
      if (codes.length > 0) return codes;
      if (single) return [single];
      return [];
    } catch {
      return [];
    }
  }

  // Helpers to detect schema.org types whether declared under "@type" or "type"
  function schemaTypeOf(payload: any): string | null {
    try {
      const t = payload?.['@type'] ?? payload?.['type'];
      return typeof t === 'string' ? t : null;
    } catch {
      return null;
    }
  }

  function isSchemaType(payload: any, endsWith: string): boolean {
    const t = schemaTypeOf(payload);
    if (!t) return false;
    const lower = t.toLowerCase();
    const end = endsWith.toLowerCase();
    return lower.endsWith('/' + end) || lower.endsWith('#' + end) || lower === end;
  }

  function isMessagePayload(payload: any): boolean {
    return isSchemaType(payload, 'Message');
  }

  // Derive a concise subject like an email client.
  function messageSubject(payload: any): string {
    const headline = (payload?.headline ?? '').toString().trim();
    if (headline) return headline;
    const text = (payload?.text ?? '').toString();
    if (text) {
      const firstLine = text.split(/\r?\n/)[0].trim();
      const subj = firstLine || text.trim();
      if (subj.length > 120) return subj.slice(0, 117) + '...';
      return subj || 'Message';
    }
    return 'Message';
  }

  function badgeForOutbox(payload: any): string {
    const trig = (payload?.trigger || '').toString().toLowerCase();
    if (trig.includes('confirm')) return 'badge-success';
    if (trig.includes('ship') || trig.includes('dispatch')) return 'badge-info';
    if (trig.includes('cancel')) return 'badge-error';
    return 'badge-ghost';
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

  function lineAt(i: number): any {
    try {
      return (snapshot as any)?.orderedItem?.[i] ?? null;
    } catch {
      return null;
    }
  }

  function getLineQuantity(i: number): number {
    const raw = lineAt(i)?.orderQuantity;
    const n = typeof raw === 'number' ? raw : Number(raw ?? 0);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return n;
  }

  function unitPrice(i: number): { amount: number | null; code: string | null } {
    try {
      const offer = (snapshot as any)?.acceptedOffer?.[i];
      const amt = typeof offer?.price === 'number' ? (offer.price as number) : null;
      const code = (offer?.priceCurrency ?? null) as string | null;
      return { amount: amt, code };
    } catch {
      return { amount: null, code: null };
    }
  }

  function lineTotal(i: number): { amount: number | null; code: string | null } {
    const { amount, code } = unitPrice(i);
    const qty = getLineQuantity(i);
    if (amount == null || !Number.isFinite(amount) || qty <= 0) return { amount: null, code };
    return { amount: amount * qty, code };
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

      // Prefer direct imageUrl from snapshot if present
      const direct = typeof lineAt(i)?.imageUrl === 'string' ? lineAt(i).imageUrl.trim() : '';
      if (direct) {
        resolved[i] = { name: lineAt(i)?.orderedItem?.name ?? null, imageUrl: direct };
        return;
      }

      const catalog = getMarketClient().catalog.forOperator(gnosisConfig.production.marketOperator);
      const prod = await catalog.fetchProductForSellerAndSku(String(evm), String(sku));
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

  // Group indices by seller so we can render a seller header once
  type SellerGroup = { sellerId: string | null; evm?: EvmAddress | undefined; indices: number[] };
  let sellerGroups: SellerGroup[] = $state([]);

  $effect(() => {
    // Resolve product meta for any lines not yet resolved
    if (!mounted || !snapshot) {
      sellerGroups = [];
      return;
    }
    const items = (snapshot as any)?.orderedItem ?? [];

    // Recompute seller groups from current snapshot
    const map = new Map<string, number[]>();
    items.forEach((_: any, idx: number) => {
      const sid = sellerIdForIndex(idx);
      const key = sid || '__unknown__';
      const arr = map.get(key) ?? [];
      arr.push(idx);
      map.set(key, arr);
    });
    sellerGroups = Array.from(map.entries()).map(([key, indices]) => {
      const sellerId = key === '__unknown__' ? null : key;
      return { sellerId, evm: evmFromEip155(sellerId ?? undefined), indices } as SellerGroup;
    });

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