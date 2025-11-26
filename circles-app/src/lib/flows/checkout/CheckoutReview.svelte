<!-- lib/flows/checkout/CheckoutReview.svelte -->
<script lang="ts">
    import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
    import { cartState, checkoutCart } from '$lib/cart/store';
    import { popupControls } from '$lib/stores/popUp';
    import CheckoutPayment from './CheckoutPayment.svelte';

    let localError: string | null = $state(null);
    let submitting = $state(false);

    const preview = $derived($cartState.orderPreview);
    const basket = $derived($cartState.basket);
    const lines = $derived((basket?.items ?? []) as any[]);
    const hasLines: boolean = $derived(lines.length > 0);

    const shippingAddress = $derived(basket?.shippingAddress as any);
    const contactPoint = $derived(basket?.contactPoint as any);
    const ageProof = $derived(basket?.ageProof as any);

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
        const seller = line?.seller;
        const parts: string[] = [];
        if (typeof sku === 'string' && sku.trim().length > 0) {
            parts.push(`SKU: ${sku.trim()}`);
        }
        if (typeof seller === 'string' && seller.trim().length > 0) {
            parts.push(`Seller: ${seller.trim()}`);
        }
        return parts.length ? parts.join(' • ') : null;
    }

    function formatCurrency(
        amount: number | null | undefined,
        code: string | null | undefined
    ): string {
        if (amount == null || !Number.isFinite(Number(amount))) {
            return '?';
        }
        const value = Number(amount);
        const rounded = value.toFixed(2);
        return code ? `${rounded} ${code}` : rounded;
    }

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
    <div class="space-y-4 text-xs">
        <!-- Order meta -->
        {#if preview}
            <div class="space-y-1">
                <div><strong>Order #</strong> {preview.orderNumber}</div>
                {#if preview.orderStatus}
                    <div>Status: {preview.orderStatus}</div>
                {/if}

                {#if preview.totalPaymentDue}
                    <div class="mt-1">
                        <span class="font-semibold">Total:</span>
                        &nbsp;
                        {#if typeof preview.totalPaymentDue.price === 'number'}
                            {preview.totalPaymentDue.price.toFixed(2)}
                        {:else}
                            ?
                        {/if}
                        {#if preview.totalPaymentDue.priceCurrency}
                            &nbsp;{preview.totalPaymentDue.priceCurrency}
                        {/if}
                    </div>
                {/if}
            </div>
        {:else}
            <div class="opacity-70">No order preview available.</div>
        {/if}

        <!-- Items -->
        {#if hasLines}
            <div class="mt-2 border border-base-300 rounded-lg bg-base-100">
                <div class="px-3 py-2 border-b border-base-300 flex items-center justify-between">
                    <span class="font-semibold text-[11px] uppercase tracking-wide">
                        Items
                    </span>
                    <span class="text-[11px] opacity-70">
                        {lines.length} item{lines.length === 1 ? '' : 's'}
                    </span>
                </div>

                <div class="divide-y divide-base-200">
                    {#each lines as line}
                        {@const unit = getLineUnitPrice(line)}
                        {@const total = getLineTotal(line)}
                        <div class="px-3 py-2 flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <div class="text-xs font-semibold truncate">
                                    {lineTitle(line)}
                                </div>
                                {#if lineSubtitle(line)}
                                    <div class="text-[11px] opacity-70 truncate">
                                        {lineSubtitle(line)}
                                    </div>
                                {/if}
                                <div class="text-[11px] opacity-70 mt-0.5">
                                    Qty: {getLineQuantity(line)}
                                </div>
                            </div>

                            <div class="text-right shrink-0">
                                {#if unit.amount != null}
                                    <div class="text-[11px] opacity-70">
                                        {formatCurrency(unit.amount, unit.code)} each
                                    </div>
                                {/if}
                                <div class="font-semibold">
                                    {#if total.amount != null}
                                        {formatCurrency(total.amount, total.code)}
                                    {:else}
                                        —
                                    {/if}
                                </div>
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
                        <div class="font-semibold text-[11px] uppercase tracking-wide mb-1">
                            Shipping address
                        </div>
                        {#each formatShippingAddress(shippingAddress) as line}
                            <div>{line}</div>
                        {/each}
                    </div>
                {/if}

                <div class="border border-base-300 rounded-lg bg-base-100 p-3">
                    <div class="font-semibold text-[11px] uppercase tracking-wide mb-1">
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

        <!-- Totals per currency (client-side) -->
        {#if totalsArray.length > 0}
            <div class="mt-1 border-t border-base-300 pt-2 text-xs space-y-1">
                {#each totalsArray as [code, total]}
                    <div class="flex justify-between">
                        <span>Items total{code ? ` (${code})` : ''}</span>
                        <span class="font-semibold">
                            {total.toFixed(2)} {code}
                        </span>
                    </div>
                {/each}
            </div>
        {/if}

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
            <div class="alert alert-error text-xs mt-2">
                {localError}
            </div>
        {/if}
    </div>
</FlowDecoration>
