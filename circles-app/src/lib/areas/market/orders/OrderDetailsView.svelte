
{#if snapshot}
  <section style="width:100%;background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;box-shadow:{T.shadow.xs};overflow:hidden;">
    <div style="padding:16px 20px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">
      <!-- Left: status + order meta -->
      <div style="min-width:0;flex:1;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-family:{T.fontMono};font-size:11px;opacity:0.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title={snapshot.orderNumber}>{snapshot.orderNumber}</span>
        </div>
        <div style="margin-top:4px;font-size:12px;opacity:0.7;">
          {#if orderDate()}
            {formatTimestamp(orderDate())}
          {/if}
        </div>
      </div>
      <!-- Right: prominent total amount like an invoice -->
      {#if priceDisplay()}
        <div style="flex-shrink:0;background:{T.pageDeep};border-radius:10px;padding:10px 16px;text-align:right;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;opacity:0.6;color:{T.inkMuted};">Total</div>
          <div style="font-size:20px;font-weight:600;line-height:1;color:{T.ink};">{priceDisplay()}</div>
        </div>
      {/if}
    </div>

    <div style="padding:0 20px 16px;display:flex;flex-direction:column;gap:16px;">
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Customer</div>
        {#if evmFromEip155(getSchemaId(snapshot.customer))}
          <Avatar
            view="horizontal"
            address={evmFromEip155(getSchemaId(snapshot.customer))}
            bottomInfo={String(evmFromEip155(getSchemaId(snapshot.customer)))}
          />
        {:else}
          <div style="font-family:{T.fontMono};font-size:13px;word-break:break-all;color:{T.ink};">{partyId(getSchemaId(snapshot.customer))}</div>
        {/if}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Broker</div>
        {#if evmFromEip155(getSchemaId(snapshot.broker))}
          <Avatar
            view="horizontal"
            address={evmFromEip155(getSchemaId(snapshot.broker))}
            bottomInfo={String(evmFromEip155(getSchemaId(snapshot.broker)))}
          />
        {:else}
          <div style="font-family:{T.fontMono};font-size:13px;word-break:break-all;color:{T.ink};">{partyId(getSchemaId(snapshot.broker))}</div>
        {/if}
      </div>

      {#if snapshot.shippingAddress}
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Shipping address</div>
          <div style="font-size:14px;line-height:1.4;color:{T.inkBody};">
            {snapshot.shippingAddress.streetAddress}
            <br />{snapshot.shippingAddress.postalCode} {snapshot.shippingAddress.addressLocality}
            <br />{snapshot.shippingAddress.addressCountry}
          </div>
        </div>
      {/if}

      {#if snapshot.billingAddress}
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Billing address</div>
          <div style="font-size:14px;line-height:1.4;color:{T.inkBody};">
            {snapshot.billingAddress.streetAddress}
            <br />{snapshot.billingAddress.postalCode} {snapshot.billingAddress.addressLocality}
            <br />{snapshot.billingAddress.addressCountry}
          </div>
        </div>
      {/if}
    </div>

    <div style="padding:12px 20px;border-top:1px solid {T.hairlineSoft};font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Items</div>
    <div style="padding:0 20px 16px;display:flex;flex-direction:column;gap:12px;">
      {#each sellerGroups as grp, gi (gi)}
        <!-- Seller header -->
        <div style="border:1px solid {T.hairlineSoft};border-radius:10px;overflow:hidden;background:rgba(255,255,255,0.8);box-shadow:{T.shadow.xs};">
          <div style="padding:8px 12px;border-bottom:1px solid {T.hairlineSoft};background:{T.pageDeep};display:flex;align-items:center;justify-content:space-between;">
            <div style="min-width:0;">
              {#if grp.evm}
                <Avatar view="horizontal" address={grp.evm} bottomInfo={shortAddr(grp.evm)} />
              {:else}
                <div style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Seller</div>
                <div style="font-family:{T.fontMono};font-size:13px;word-break:break-all;color:{T.ink};">{grp.sellerId ?? 'Unknown'}</div>
              {/if}
            </div>
            <div style="flex-shrink:0;font-size:11px;opacity:0.6;">{grp.indices.length} item{grp.indices.length === 1 ? '' : 's'}</div>
          </div>

          <!-- Lines for this seller -->
          <div style="display:flex;flex-direction:column;">
            {#each grp.indices as i}
              <div style="padding:8px 12px;background:rgba(0,0,0,0.02);cursor:pointer;border-top:1px solid {T.hairlineSoft};"
                   role="button" tabindex="0"
                   onclick={() => goToOffer(i)}
                   onkeydown={(e) => onKeyGoToOffer(e, i)}>
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
                  <!-- Left: thumbnail + title -->
                  <div style="display:flex;align-items:center;gap:12px;min-width:0;">
                    <div style="width:56px;height:56px;border-radius:6px;background:{T.pageDeep};overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                      {#if resolved[i]?.imageUrl}
                        <img src={resolved[i]?.imageUrl || ''}
                             alt={resolved[i]?.name ?? lineAt(i)?.orderedItem?.sku ?? 'Product image'}
                             style="width:56px;height:56px;object-fit:cover;" />
                      {:else}
                        <span style="font-size:10px;opacity:0.6;">No image</span>
                      {/if}
                    </div>

                    <div style="min-width:0;">
                      <div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:{T.ink};">{resolved[i]?.name || lineAt(i)?.orderedItem?.name || lineAt(i)?.orderedItem?.sku || 'Item'}</div>
                      <div style="font-size:12px;opacity:0.7;margin-top:2px;color:{T.inkMuted};">Qty: {lineAt(i)?.orderQuantity ?? 1}</div>
                      {#if lineAt(i)?.productCid}
                        <div style="font-family:{T.fontMono};font-size:11px;opacity:0.7;word-break:break-all;">{lineAt(i)?.productCid}</div>
                      {/if}
                    </div>
                  </div>

                  <!-- Right: prices -->
                  <div style="text-align:right;flex-shrink:0;">
                    {#if unitPrice(i).amount != null}
                      <div style="font-size:12px;opacity:0.7;color:{T.inkMuted};">{formatCurrency(unitPrice(i).amount, unitPrice(i).code)} each</div>
                    {/if}
                    <div style="font-weight:600;color:{T.ink};">
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
        <div style="font-size:14px;opacity:0.7;color:{T.inkMuted};">No items</div>
      {/if}
    </div>

    <div style="padding:12px 20px;border-top:1px solid {T.hairlineSoft};font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">
      Status history
    </div>
    <div style="padding:0 20px 12px;display:flex;flex-direction:column;gap:6px;font-size:14px;">
      {#if timeline.length === 0}
        <div style="font-size:12px;opacity:0.7;color:{T.inkMuted};">No status changes recorded.</div>
      {:else}
        {#each timeline as evt, idx}
          <div style="display:flex;align-items:flex-start;gap:8px;">
            <div style="margin-top:4px;width:8px;height:8px;border-radius:50%;flex-shrink:0;background:{idx === timeline.length - 1 ? T.primary : T.hairline};"></div>
            <div style="display:flex;flex-direction:column;">
              <div style="font-weight:500;color:{T.ink};">
                {statusLabel(evt.status) ?? evt.status}
              </div>
              <div style="font-size:12px;opacity:0.7;color:{T.inkMuted};">
                {formatTimestamp(evt.changedAt)}
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    {#if snapshot?.outbox && snapshot.outbox.length > 0}
      <div style="padding:12px 20px;border-top:1px solid {T.hairlineSoft};font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">
        Messages
      </div>
      <div style="padding:0 20px 12px;display:flex;flex-direction:column;gap:8px;font-size:14px;">
        {#each snapshot.outbox as item}
          <div style="border:1px solid {T.hairlineSoft};border-radius:10px;background:rgba(255,255,255,0.6);padding:8px;display:flex;flex-direction:column;gap:4px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div style="display:flex;align-items:center;gap:8px;">
                {#if !isMessagePayload(item.payload)}
                  <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:{T.pageDeep};color:{T.inkMuted};font-family:{T.fontSans};">
                    {outboxLabel(item.payload)}
                  </span>
                {/if}
                {#if item.source}
                  <span style="font-size:11px;opacity:0.6;color:{T.inkMuted};">{item.source}</span>
                {/if}
              </div>
              <span style="font-size:11px;opacity:0.6;color:{T.inkMuted};">
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
  <div style="font-size:14px;opacity:0.7;color:{T.inkMuted};">No order data</div>
{/if}

{#snippet OutboxPayloadView({ payload })}
  {#if isKnownDownloadPayload(payload)}
    <div style="display:flex;align-items:center;gap:8px;">
      <JumpLink
        style="display:inline-flex;align-items:center;height:36px;padding:0 18px;border-radius:9999px;border:0;background:{T.primary};color:#fff;text-decoration:none;font-family:{T.fontSans};font-size:13px;font-weight:580;box-shadow:0 4px 12px rgba(88,73,212,0.25);"
        url={payload.downloadUrl || payload.contentUrl}
      >
        Download
      </JumpLink>
      {#if payload.expiresAt}
        <span style="font-size:11px;opacity:0.7;color:{T.inkMuted};">
          Expires: {formatTimestamp(payload.expiresAt)}
        </span>
      {/if}
    </div>
  {:else if isVoucherPayload(payload)}
    <div style="font-size:12px;display:flex;align-items:flex-start;gap:8px;">
      <span style="opacity:0.7;flex-shrink:0;margin-top:2px;color:{T.inkMuted};">Codes:</span>
      <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;">
        {#each voucherCodes(payload) as c}
          <li style="max-width:100%;">
            <code style="font-family:{T.fontMono};font-size:11px;word-break:break-all;display:inline-block;max-width:100%;padding:2px 6px;background:{T.pageDeep};border:1px solid {T.hairlineSoft};border-radius:4px;">{c}</code>
          </li>
        {/each}
      </ul>
    </div>
  {:else if isMessagePayload(payload)}
    <div style="display:flex;flex-direction:column;gap:6px;">
      <div style="font-size:14px;font-weight:600;color:{T.ink};">
        {messageSubject(payload)}
      </div>
      {#if payload.text}
        <div style="font-size:14px;line-height:1.6;white-space:pre-line;opacity:0.9;color:{T.inkBody};">{payload.text}</div>
      {/if}
    </div>
  {:else}
    <pre style="font-size:11px;background:{T.pageDeep};border-radius:8px;padding:8px;overflow:auto;">{JSON.stringify(payload, null, 2)}</pre>
  {/if}
{/snippet}

<style>
</style>

<script lang="ts">
  import { T } from '$lib/design-system/tokens.js';
  import { formatCurrency } from '$lib/shared/utils/money';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import JumpLink from '$lib/shared/ui/content/jump/JumpLink.svelte';
  import type { Address as EvmAddress } from '@circles-sdk/utils';
  import type { OrderSnapshot } from '$lib/areas/market/orders/types';
  import type { OrderStatusChange } from '$lib/areas/market/orders/types';
  import { formatTimestamp, statusLabel } from '$lib/areas/market/orders/status';
  import { onMount } from 'svelte';
  import { getProduct, pickProductImageUrl } from '$lib/areas/market/services';
  import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
  import { popupControls, type PopupContentDefinition } from '$lib/shared/state/popup';
  import { ProductDetailsPopup } from '$lib/areas/market/ui';
  import { gnosisConfig } from '$lib/shared/config/circles';
  import { safeParse } from '$lib/shared/utils/safe';

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
    return safeParse(
      'outboxLabel',
      () => {
        const t = (payload && typeof payload === 'object') ? payload['@type'] || payload['type'] : null;
        if (typeof t === 'string' && t.length > 0) {
          const parts = t.split(/[\/#]/);
          return parts[parts.length - 1] || 'Outbox item';
        }
        return 'Outbox item';
      },
      'Outbox item'
    );
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
    return safeParse(
      'isVoucherPayload',
      () => {
        const t = (payload?.['@type'] ?? '').toString().toLowerCase();
        const hasType = t.includes('voucher') || t.includes('codedispenserresult');
        const hasSingle = typeof payload?.code === 'string' && payload.code.length > 0;
        const codes = Array.isArray(payload?.codes)
          ? payload.codes.filter((x: any) => typeof x === 'string' && x.length > 0)
          : [];
        const hasMany = codes.length > 0;
        return hasType && (hasSingle || hasMany);
      },
      false
    );
  }

  function voucherCodes(payload: any): string[] {
    return safeParse(
      'voucherCodes',
      () => {
        const arr = Array.isArray(payload?.codes) ? payload.codes : [];
        const codes = arr.filter((x: any) => typeof x === 'string' && x.length > 0);
        const single = (payload?.code ?? '').toString();
        if (codes.length > 0) return codes;
        if (single) return [single];
        return [];
      },
      []
    );
  }

  // Helpers to detect schema.org types whether declared under "@type" or "type"
  function schemaTypeOf(payload: any): string | null {
    return safeParse(
      'schemaTypeOf',
      () => {
        const t = payload?.['@type'] ?? payload?.['type'];
        return typeof t === 'string' ? t : null;
      },
      null
    );
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
    return safeParse(
      'getSchemaId',
      () => {
        if (x && typeof x === 'object') {
          const v = (x as any)['@id'];
          return typeof v === 'string' ? v : null;
        }
        return null;
      },
      null
    );
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
    return safeParse(
      'orderDate',
      () => {
        const d = (snapshot as any)?.orderDate;
        return typeof d === 'string' ? d : null;
      },
      null
    );
  }
  
  function priceDisplay(): string | null {
    const p = snapshot?.totalPaymentDue;
    if (!p) return null;
    return formatCurrency(p.price ?? null, p.priceCurrency ?? null);
  }

  // Extract seller @id for a given item index, aligning with acceptedOffer order.
  function sellerIdForIndex(i: number): string | null {
    return safeParse(
      'sellerIdForIndex',
      () => {
        const offer = (snapshot as any)?.acceptedOffer?.[i];
        const sellerObj = offer?.seller;
        return getSchemaId(sellerObj);
      },
      null
    );
  }

  // Resolve product name and image per line item using seller + sku
  type ResolvedLine = { name?: string | null; imageUrl?: string | null } | null;
  let resolved: Record<number, ResolvedLine> = $state({});

  function skuForIndex(i: number): string | null {
    return safeParse(
      'skuForIndex',
      () => {
        const sku = (snapshot as any)?.orderedItem?.[i]?.orderedItem?.sku;
        return typeof sku === 'string' && sku ? sku : null;
      },
      null
    );
  }

  function lineAt(i: number): any {
    return safeParse(
      'lineAt',
      () => (snapshot as any)?.orderedItem?.[i] ?? null,
      null
    );
  }

  function getLineQuantity(i: number): number {
    const raw = lineAt(i)?.orderQuantity;
    const n = typeof raw === 'number' ? raw : Number(raw ?? 0);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return n;
  }

  function unitPrice(i: number): { amount: number | null; code: string | null } {
    return safeParse(
      'unitPrice',
      () => {
        const offer = (snapshot as any)?.acceptedOffer?.[i];
        const amt = typeof offer?.price === 'number' ? (offer.price as number) : null;
        const code = (offer?.priceCurrency ?? null) as string | null;
        return { amount: amt, code };
      },
      { amount: null, code: null }
    );
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
      console.debug('[orders] resolveLine failed', { i }, e);
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