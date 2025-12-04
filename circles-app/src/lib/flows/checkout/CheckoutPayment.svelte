<!-- lib/flows/checkout/CheckoutPayment.svelte -->
<script lang="ts">
    import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
    import QrCode from '$lib/components/QrCode.svelte';
    import { cartState } from '$lib/cart/store';

    const paymentReference = $derived($cartState.lastCheckout?.paymentReference ?? null);
    const basketId = $derived($cartState.basket?.basketId ?? null);

    // Do NOT include orderKey in any QR codes or UI. Prefer non-secret paymentReference.
    const paymentQrValue = $derived(
        paymentReference
            ? `circles:payment:${paymentReference}`
            : basketId
                ? `circles:basket:${basketId}`
                : 'circles:payment'
    );
</script>

<FlowDecoration>
    <div class="space-y-3 text-xs">
        <div class="alert alert-info">
      <span>
        Scan this QR code with the Circles app to execute the payment.
        (Mock only – payload: <code>{paymentQrValue}</code>).
      </span>
        </div>

        <div class="flex justify-center">
            <QrCode value={paymentQrValue} />
        </div>

        {#if paymentReference}
            <div class="mt-2 text-xs opacity-70 text-center">
                Payment reference: <code>{paymentReference}</code>
            </div>
        {/if}
    </div>
</FlowDecoration>
