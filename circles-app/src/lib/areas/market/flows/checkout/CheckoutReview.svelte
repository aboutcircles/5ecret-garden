<!-- lib/flows/checkout/CheckoutReview.svelte -->
<script lang="ts">
    import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
    import StepActionButtons from '$lib/shared/ui/flow/StepActionButtons.svelte';
    import { CHECKOUT_FLOW_SCAFFOLD_BASE } from './constants';
    import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
    import StepSection from '$lib/shared/ui/flow/StepSection.svelte';
    import StepReviewRow from '$lib/shared/ui/flow/StepReviewRow.svelte';
    import { openStep, popToOrOpen, useAsyncAction } from '$lib/shared/flow';
    import { cartState, checkoutCart } from '$lib/areas/market/cart/store';
    import { popupControls } from '$lib/shared/state/popup';
    import CartPanel from './CartPanel.svelte';
    import CheckoutForms from './CheckoutForms.svelte';
    import CheckoutPayment from './CheckoutPayment.svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { useResolvedProducts } from '$lib/areas/market/flows/checkout/useResolvedProducts';

    const checkoutAction = useAsyncAction(async () => {
        await checkoutCart();
        openStep({
            title: 'Pay order',
            component: CheckoutPayment,
            props: {},
        });
    });

    async function finalizeCheckout(): Promise<void> {
        checkoutAction.reset();
        await checkoutAction.run();
    }

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

    const { findCatalogItem, imageUrlForLine } = useResolvedProducts(lines);

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

    import { formatCurrency } from '$lib/shared/utils/money';

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
    const totalsArray: [string, number][] = $derived.by(() => {
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


    function editCart(): void {
        popToOrOpen(CartPanel, {
            title: 'Cart',
            props: {},
        });
    }

    function editDetails(): void {
        popToOrOpen(CheckoutForms, {
            title: 'Additional details',
            props: {},
        });
    }
</script>

<FlowStepScaffold
  {...CHECKOUT_FLOW_SCAFFOLD_BASE}
  className="space-y-4 text-sm"
  step={3}
  title="Review"
  subtitle="Review cart and checkout details before payment."
>

        <StepSection title="Review actions" subtitle="Adjust cart items or checkout details if needed.">
            <StepReviewRow label="Cart items" value={`${lines.length} item${lines.length === 1 ? '' : 's'}`} onChange={editCart} changeLabel="Edit" />
            <StepReviewRow label="Checkout details" value={hasShippingInfo ? 'Provided' : 'Not provided'} onChange={editDetails} changeLabel="Edit" />
        </StepSection>

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
        <StepActionButtons
            className="mt-3"
            primaryLabel={checkoutAction.loading ? 'Creating order…' : 'Confirm & pay'}
            onPrimary={finalizeCheckout}
            primaryDisabled={checkoutAction.loading || $cartState.loading}
            primaryClass="btn btn-sm btn-primary"
        />

        {#if checkoutAction.error}
            <StepAlert variant="error" className="mt-2" message={checkoutAction.error} />
        {/if}
    </FlowStepScaffold>
