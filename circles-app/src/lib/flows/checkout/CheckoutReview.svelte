<!-- lib/flows/checkout/CheckoutReview.svelte -->
<script lang="ts">
    import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
    import { cartState, checkoutCart } from '$lib/cart/store';
    import { popupControls } from '$lib/stores/popUp';
    import CheckoutPayment from './CheckoutPayment.svelte';
    import { fetchProductForSellerAndSku } from '$lib/market/catalogClient';
    import type { AggregatedCatalogItem } from '$lib/market/types';
    import { pickFirstProductImageUrl } from '$lib/market/imageHelpers';
    import Avatar from '$lib/components/avatar/Avatar.svelte';

    let localError: string | null = $state(null);
    let submitting = $state(false);

    const preview = $derived($cartState.orderPreview);
    const basket = $derived($cartState.basket);
    const lines = $derived((basket?.items ?? []) as any[]);
    const hasLines: boolean = $derived(lines.length > 0);

    // Group basket lines by seller to show a header per seller
    type ReviewGroup = { seller: string | null; indices: number[] };
    const reviewGroups: ReviewGroup[] = $derived((() => {
        const map = new Map<string, number[]>();
        lines.forEach((_, idx) => {
            const seller = (lines[idx]?.seller as string | undefined) ?? null;
            const key = seller || '__unknown__';
            const arr = map.get(key) ?? [];
            arr.push(idx);
            map.set(key, arr);
        });
        return Array.from(map.entries()).map(([key, idxs]) => ({ seller: key === '__unknown__' ? null : (key as string), indices: idxs }));
    })());

    const shippingAddress = $derived(basket?.shippingAddress as any);
    const contactPoint = $derived(basket?.contactPoint as any);
    const ageProof = $derived(basket?.ageProof as any);

    // Resolve product metadata (name, image) for review items
    type ProductKey = string;
    function productKey(seller: string | undefined, sku: string | undefined): ProductKey | null {
        if (!seller || !sku) return null;
        return `${seller.toLowerCase()}::${sku.toLowerCase()}`;
    }

    let resolvedProducts: Record<ProductKey, AggregatedCatalogItem | null> = $state({});
    let resolvingKeys: Set<ProductKey> = new Set();

    function findCatalogItem(
        seller: string | undefined,
        sku: string | undefined,
    ): AggregatedCatalogItem | undefined {
        const key = productKey(seller, sku);
        if (!key) return undefined;
        const entry = resolvedProducts[key];
        return entry ?? undefined;
    }

    function imageUrlForLine(line: any): string | null {
        const item = findCatalogItem(line?.seller as string | undefined, line?.orderedItem?.sku as string | undefined);
        if (!item) return null;
        return pickFirstProductImageUrl(item.product);
    }

    // Background fetch of product metadata
    $effect(() => {
        for (const line of lines) {
            const seller = line?.seller as string | undefined;
            const sku = line?.orderedItem?.sku as string | undefined;
            const key = productKey(seller, sku);
            if (!key) continue;
            const known = Object.prototype.hasOwnProperty.call(resolvedProducts, key);
            const busy = resolvingKeys.has(key);
            if (known || busy) continue;

            resolvingKeys.add(key);
            resolvedProducts = { ...resolvedProducts, [key]: null };
            void (async () => {
                try {
                    const item = await fetchProductForSellerAndSku(seller as string, sku as string);
                    resolvedProducts = { ...resolvedProducts, [key]: item };
                } catch {
                    resolvedProducts = { ...resolvedProducts, [key]: null };
                } finally {
                    resolvingKeys.delete(key);
                }
            })();
        }
    });

    function lineTitle(line: any): string {
        const name = line?.orderedItem?.name;
        const sku = line?.orderedItem?.sku;
        if (typeof name === 'string' && name.trim().length > 0) {
            return name.trim();
        }
        if (typeof sku === 'string' && sku.trim().length > 0) {
            return sku.trim();
        }
        return 'Item';
    }

    function lineSubtitle(line: any): string | null {
        const sku = line?.orderedItem?.sku;
        const parts: string[] = [];
        if (typeof sku === 'string' && sku.trim().length > 0) {
            parts.push(`SKU: ${sku.trim()}`);
        }
        return parts.length ? parts.join(' • ') : null;
    }

    import { formatCurrency } from '$lib/cart/money';

    function getLineUnitPrice(line: any): { amount: number | null; code: string | null } {
        const snap = line?.offerSnapshot;
        const price = typeof snap?.price === 'number' ? snap.price : null;
        const code = (snap?.priceCurrency ?? null) as string | null;
        return { amount: price, code };
    }

    function getLineQuantity(line: any): number {
        const raw = line?.orderQuantity;
        const n = typeof raw === 'number' ? raw : Number(raw ?? 0);
        if (!Number.isFinite(n) || n < 0) return 0;
        return n;
    }

    function getLineTotal(line: any): { amount: number | null; code: string | null } {
        const { amount, code } = getLineUnitPrice(line);
        const qty = getLineQuantity(line);
        if (amount == null || !Number.isFinite(amount) || qty <= 0) {
            return { amount: null, code };
        }
        return { amount: amount * qty, code };
    }

    // Aggregate totals per currency using a plain object so SES doesn’t choke on Map proxies
    const totalsArray: [string, number][] = $derived(() => {
        const acc: Record<string, number> = {};
        for (const line of lines) {
            const { amount, code } = getLineTotal(line);
            if (amount == null || !Number.isFinite(amount)) continue;
            const key = (code ?? '') as string;
            const prev = acc[key] ?? 0;
            acc[key] = prev + amount;
        }
        return Object.entries(acc).map(
            ([code, total]) => [code, total as number] as [string, number]
        );
    });

    // Prefer the server-provided preview total; fall back to the first subtotal
    type OrderTotal = { amount: number | null; code: string | null };
    const orderTotal: OrderTotal = $derived((() => {
        const p = (preview as any)?.totalPaymentDue;
        const amt = typeof p?.price === 'number' ? (p.price as number) : null;
        const code = (p?.priceCurrency ?? null) as string | null;
        if (amt != null) return { amount: amt, code };
        if (totalsArray.length > 0) {
            const [c, t] = totalsArray[0];
            return { amount: t, code: (c || null) as string | null };
        }
        return { amount: null, code: null };
    })());

    const hasShippingInfo: boolean = $derived(
        !!shippingAddress ||
        !!contactPoint ||
        !!ageProof
    );

    function formatShippingAddress(addr: any): string[] {
        if (!addr || typeof addr !== 'object') return [];
        const parts: string[] = [];
        if (addr.streetAddress) parts.push(String(addr.streetAddress));
        const cityLineParts: string[] = [];
        if (addr.postalCode) cityLineParts.push(String(addr.postalCode));
        if (addr.addressLocality) cityLineParts.push(String(addr.addressLocality));
        if (cityLineParts.length) parts.push(cityLineParts.join(' '));
        if (addr.addressCountry) parts.push(String(addr.addressCountry));
        return parts;
    }

    function formatContactPoint(cp: any): string[] {
        if (!cp || typeof cp !== 'object') return [];
        const parts: string[] = [];
        if (cp.email) parts.push(`Email: ${cp.email}`);
        if (cp.telephone) parts.push(`Phone: ${cp.telephone}`);
        return parts;
    }

    function formatAgeProof(age: any): string | null {
        if (!age || typeof age !== 'object') return null;
        if (!age.birthDate) return null;
        return `Birth date: ${age.birthDate}`;
    }

    async function finalizeCheckout(): Promise<void> {
        localError = null;
        submitting = true;
        try {
            await checkoutCart();
            popupControls.open({
                title: 'Pay order',
                component: CheckoutPayment,
                props: {},
            });
        } catch (e: unknown) {
            localError =
                e instanceof Error
                    ? e.message
                    : typeof e === 'string'
                        ? e
                        : 'Unknown error while creating order';
        } finally {
            submitting = false;
        }
    }
</script>

<FlowDecoration>
    <div class="space-y-4 text-sm">
        <!-- Order meta -->
        {#if preview}
            <div class="space-y-1">
                <div><strong>Order #</strong> {preview.orderNumber}</div>
                <!-- Total moved to bottom-right summary under subtotals -->
            </div>
        {:else}
            <div class="opacity-70">No order preview available.</div>
        {/if}

        <!-- Items -->
        {#if hasLines}
            <div class="mt-2 border border-base-300 rounded-lg bg-base-100">
                <div class="px-3 py-2 border-b border-base-300 flex items-center justify-between">
                    <span class="font-semibold text-xs uppercase tracking-wide">
                        Items
                    </span>
                    <span class="text-xs opacity-70">
                        {lines.length} item{lines.length === 1 ? '' : 's'}
                    </span>
                </div>

                <div class="flex flex-col">
                    {#each reviewGroups as grp, gi (gi)}
                        <div class="border-b last:border-b-0">
                            <div class="px-3 py-2 bg-base-200/60 flex items-center justify-between border-b">
                                {#if grp.seller}
                                    <Avatar view="horizontal" address={grp.seller} bottomInfo={grp.seller} />
                                {:else}
                                    <div class="text-xs uppercase tracking-wide opacity-60">Seller</div>
                                {/if}
                                <div class="text-[11px] opacity-60">{grp.indices.length} item{grp.indices.length === 1 ? '' : 's'}</div>
                            </div>
                            <div class="divide-y divide-base-200">
                                {#each grp.indices as i}
                                    <div class="px-3 py-2 bg-base-200/20 flex items-start justify-between gap-3">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <div class="w-14 h-14 rounded bg-base-200 overflow-hidden shrink-0 flex items-center justify-center">
                                                {#if imageUrlForLine(lines[i])}
                                                    <img src={imageUrlForLine(lines[i]) || ''} alt={findCatalogItem(lines[i].seller, lines[i].orderedItem?.sku)?.product.name || 'product-image'} class="w-14 h-14 object-cover" loading="lazy" />
                                                {:else}
                                                    <span class="text-[10px] opacity-60">No image</span>
                                                {/if}
                                            </div>

                                            <div class="min-w-0">
                                                <div class="font-semibold truncate">
                                                    {findCatalogItem(lines[i].seller, lines[i].orderedItem?.sku)?.product.name ?? lineTitle(lines[i])}
                                                </div>
                                                {#if lineSubtitle(lines[i])}
                                                    <div class="text-xs opacity-70 truncate">
                                                        {lineSubtitle(lines[i])}
                                                    </div>
                                                {/if}
                                                <div class="text-xs opacity-70 mt-0.5">
                                                    Qty: {getLineQuantity(lines[i])}
                                                </div>
                                            </div>
                                        </div>

                                        <div class="text-right shrink-0">
                                            {#if getLineUnitPrice(lines[i]).amount != null}
                                                <div class="text-xs opacity-70">
                                                    {formatCurrency(getLineUnitPrice(lines[i]).amount, getLineUnitPrice(lines[i]).code)} each
                                                </div>
                                            {/if}
                                            <div class="font-semibold">
                                                {#if getLineTotal(lines[i]).amount != null}
                                                    {formatCurrency(getLineTotal(lines[i]).amount, getLineTotal(lines[i]).code)}
                                                {:else}
                                                    —
                                                {/if}
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {:else}
            <div class="opacity-70">
                No basket items attached to this order yet.
            </div>
        {/if}

        <!-- Shipping & contact summary -->
        {#if hasShippingInfo}
            <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {#if shippingAddress}
                    <div class="border border-base-300 rounded-lg bg-base-100 p-3">
                        <div class="font-semibold text-xs uppercase tracking-wide mb-1">
                            Shipping address
                        </div>
                        {#each formatShippingAddress(shippingAddress) as line}
                            <div>{line}</div>
                        {/each}
                    </div>
                {/if}

                <div class="border border-base-300 rounded-lg bg-base-100 p-3">
                    <div class="font-semibold text-xs uppercase tracking-wide mb-1">
                        Contact
                    </div>
                    {#if formatContactPoint(contactPoint).length > 0}
                        {#each formatContactPoint(contactPoint) as line}
                            <div>{line}</div>
                        {/each}
                    {:else}
                        <div class="opacity-70">No contact details provided.</div>
                    {/if}
                    {#if formatAgeProof(ageProof)}
                        <div class="mt-1">{formatAgeProof(ageProof)}</div>
                    {/if}
                </div>
            </div>
        {/if}

        <!-- Totals per currency (client-side) + grand total at bottom-right -->
        <div class="mt-2 flex justify-end">
            <div class="text-right text-sm">
                {#if totalsArray.length > 0}
                    <div class="space-y-1">
                        {#each totalsArray as [code, total]}
                            <div class="flex items-baseline justify-between gap-6">
                                <span class="opacity-80">Items subtotal{code ? ` (${code})` : ''}</span>
                                <span class="font-medium">{formatCurrency(total, code || null)}</span>
                            </div>
                        {/each}
                    </div>
                {/if}
                {#if orderTotal.amount != null}
                    <div class="mt-2 border-t border-base-300 pt-2">
                        <div class="text-[11px] uppercase tracking-wide opacity-60">Total</div>
                        <div class="text-xl font-semibold">{formatCurrency(orderTotal.amount, orderTotal.code)}</div>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Action + error -->
        <div class="mt-3 flex justify-end">
            <button
                    type="button"
                    class="btn btn-sm btn-primary"
                    onclick={finalizeCheckout}
                    disabled={submitting || $cartState.loading}
            >
                {submitting ? 'Creating order…' : 'Confirm & pay'}
            </button>
        </div>

        {#if localError}
            <div class="alert alert-error text-sm mt-2">
                {localError}
            </div>
        {/if}
    </div>
</FlowDecoration>
