<!-- lib/flows/checkout/CheckoutReview.svelte -->
<script lang="ts">
    import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
    import { CHECKOUT_FLOW_SCAFFOLD_BASE } from './constants';
    import { T } from '$lib/design-system/tokens.js';
    import Icon from '$lib/design-system/Icon.svelte';
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

    const { findCatalogItem, imageUrlForLine } = useResolvedProducts(lines);

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

    const finalizeDisabled = $derived(checkoutAction.loading || $cartState.loading);

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
  step={3}
  title="Review"
  subtitle="Review cart and checkout details before payment."
>

        <!-- Information section -->
        <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
                <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Information</span>
                <button
                    type="button"
                    style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.inkMuted};font-size:11px;font-weight:540;cursor:pointer;"
                    onclick={editDetails}
                ><Icon name="edit" size={9} stroke={T.inkMuted} /> Edit</button>
            </div>
            {#if hasShippingInfo}
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    {#if shippingAddress}
                        <div style="background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;">
                            <div style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.05em;text-transform:uppercase;margin-bottom:3px;">Shipping</div>
                            {#each formatShippingAddress(shippingAddress) as line}
                                <div style="font-size:12px;color:{T.ink};line-height:1.4;">{line}</div>
                            {/each}
                        </div>
                    {/if}

                    <div style="background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;">
                        <div style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.05em;text-transform:uppercase;margin-bottom:3px;">Contact</div>
                        {#if formatContactPoint(contactPoint).length > 0}
                            {#each formatContactPoint(contactPoint) as line}
                                <div style="font-size:12px;color:{T.ink};line-height:1.4;">{line}</div>
                            {/each}
                        {:else}
                            <div style="font-size:12px;color:{T.inkMuted};">No contact details.</div>
                        {/if}
                        {#if formatAgeProof(ageProof)}
                            <div style="font-size:12px;color:{T.ink};line-height:1.4;">{formatAgeProof(ageProof)}</div>
                        {/if}
                    </div>
                </div>
            {:else}
                <div style="font-size:12.5px;color:{T.inkMuted};">No shipping or contact details provided.</div>
            {/if}
        </div>

        <!-- Items -->
        {#if hasLines}
            <div style="display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Items</span>
                    <button
                        type="button"
                        style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:9999px;border:1px solid {T.hairline};background:{T.surface};color:{T.inkMuted};font-size:11px;font-weight:540;cursor:pointer;"
                        onclick={editCart}
                    ><Icon name="edit" size={9} stroke={T.inkMuted} /> Edit</button>
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
            <div style="font-size:12.5px;color:{T.inkMuted};">No basket items attached to this order yet.</div>
        {/if}

        <!-- Totals -->
        <div style="
            background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:14px;
            padding:14px 16px;display:flex;flex-direction:column;gap:6px;
        ">
            {#if totalsArray.length > 0}
                {#each totalsArray as [code, total]}
                    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:24px;">
                        <span style="font-size:12px;color:{T.inkMuted};">Items subtotal{code ? ` (${code})` : ''}</span>
                        <span style="font-size:13px;font-weight:540;color:{T.ink};">{formatCurrency(total, code || null)}</span>
                    </div>
                {/each}
            {/if}
            {#if orderTotal.amount != null}
                <div style="margin-top:6px;padding-top:8px;border-top:1px solid {T.hairlineSoft};display:flex;justify-content:space-between;align-items:baseline;">
                    <span style="font-size:11px;color:{T.inkMuted};font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Total</span>
                    <span style="font-family:{T.fontDisplay};font-size:24px;color:{T.ink};letter-spacing:-0.01em;line-height:1;">
                        {formatCurrency(orderTotal.amount, orderTotal.code)}
                    </span>
                </div>
            {/if}
        </div>

        <!-- Action -->
        <div style="display:flex;justify-content:flex-end;margin-top:4px;">
            <button
                type="button"
                style="
                    height:48px;padding:0 26px;border-radius:9999px;border:0;cursor:{finalizeDisabled ? 'wait' : 'pointer'};
                    background:{T.primary};color:#fff;
                    font-family:{T.fontSans};font-size:14.5px;font-weight:580;
                    box-shadow:0 6px 16px rgba(88,73,212,0.3);
                    display:inline-flex;align-items:center;gap:8px;
                    opacity:{finalizeDisabled ? 0.7 : 1};
                "
                onclick={finalizeCheckout}
                disabled={finalizeDisabled}
            >
                {#if checkoutAction.loading}<svg class="checkoutreview-spin" style="width:14px;height:14px;color:#fff;" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/></svg>{/if}
                {checkoutAction.loading ? 'Creating order…' : 'Confirm & pay'}
            </button>
        </div>

        {#if checkoutAction.error}
            <StepAlert variant="error" message={checkoutAction.error} />
        {/if}
    </FlowStepScaffold>

<style>
@keyframes checkoutreview-spin{from{}to{transform:rotate(360deg)}}.checkoutreview-spin{animation:checkoutreview-spin 0.8s linear infinite;}
</style>
