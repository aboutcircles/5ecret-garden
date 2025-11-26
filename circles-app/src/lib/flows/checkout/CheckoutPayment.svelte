<!-- lib/flows/checkout/CheckoutPayment.svelte -->
<script lang="ts">
    import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
    import QrCode from '$lib/components/QrCode.svelte';
    import { cartState } from '$lib/cart/store';

    const lastOrderId = $derived($cartState.lastOrderId ?? null);
    const basketId = $derived($cartState.basket?.basketId ?? null);

    const paymentQrValue = $derived(
        lastOrderId
            ? `circles:order:${lastOrderId}`
            : basketId
                ? `circles:basket:${basketId}`
                : 'circles:order',
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

        {#if lastOrderId}
            <div class="mt-2 text-xs opacity-70 text-center">
                Order created: <code>{lastOrderId}</code>
            </div>
        {/if}
    </div>
</FlowDecoration>
