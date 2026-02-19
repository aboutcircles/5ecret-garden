<!-- lib/flows/checkout/CheckoutReview.svelte -->
<script lang="ts">
    import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
    import StepActionButtons from '$lib/shared/ui/flow/StepActionButtons.svelte';
    import { CHECKOUT_FLOW_SCAFFOLD_BASE } from './constants';
    import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
    import { openStep, popToOrOpen, useAsyncAction } from '$lib/shared/flow';
    import { cartState, checkoutCart } from '$lib/areas/market/cart/store';
    import CartPanel from './CartPanel.svelte';
    import CheckoutForms from './CheckoutForms.svelte';
    import CheckoutPayment from './CheckoutPayment.svelte';
    import { useResolvedProducts } from '$lib/areas/market/flows/checkout/useResolvedProducts';
    import OrderLineTable from './OrderLineTable.svelte';
    import { formatCurrency } from '$lib/shared/utils/money';

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

    const shippingAddress = $derived(basket?.shippingAddress as any);
    const contactPoint = $derived(basket?.contactPoint as any);
    const ageProof = $derived(basket?.ageProof as any);

    const { findCatalogItem, imageUrlForLine } = useResolvedProducts(() => lines);

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

        <div class="space-y-2">
            <div class="flex items-center justify-between mb-2">
                <div class="text-xs uppercase tracking-wide text-base-content/60">Information</div>
                <button type="button" class="btn btn-ghost btn-xs" onclick={editDetails}>
                    Edit
                </button>
            </div>
            {#if hasShippingInfo}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {#if shippingAddress}
                        <div class="bg-base-100 p-3">
                            <div class="font-semibold text-xs uppercase tracking-wide mb-1">Shipping address</div>
                            {#each formatShippingAddress(shippingAddress) as line}
                                <div>{line}</div>
                            {/each}
                        </div>
                    {/if}

                    <div class="bg-base-100 p-3">
                        <div class="font-semibold text-xs uppercase tracking-wide mb-1">Contact</div>
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
            {:else}
                <div class="text-sm text-base-content/70">No shipping or contact details provided.</div>
            {/if}
        </div>

        <!-- Items -->
        {#if hasLines}
            <div class="mt-2">
                <div class="flex items-center justify-between mb-2">
                    <div class="text-xs uppercase tracking-wide text-base-content/60">Items</div>
                    <button type="button" class="btn btn-ghost btn-xs" onclick={editCart}>
                        Edit
                    </button>
                </div>
                <OrderLineTable
                    lines={lines}
                    {findCatalogItem}
                    {imageUrlForLine}
                    {getLineQuantity}
                    {getLineUnitPrice}
                    {getLineTotal}
                />
            </div>
        {:else}
            <div class="opacity-70">
                No basket items attached to this order yet.
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
