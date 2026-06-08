<!-- lib/flows/checkout/CheckoutPayment.svelte -->
<script lang="ts">
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { CHECKOUT_FLOW_SCAFFOLD_BASE } from './constants';
  import QrCode from '$lib/shared/ui/primitives/QrCode.svelte';
  import { T } from '$lib/design-system/tokens.js';
  import { cartState } from '$lib/areas/market/cart/store';

  import { openStep } from '$lib/shared/flow';
  import SendFlow from '$lib/areas/wallet/flows/send/4_Send.svelte';
  import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';

  interface Props {
    transferContext?: SendFlowContext | null;
    chainWarning?: string | null;
  }

  let { transferContext = null, chainWarning = null }: Props = $props();

  const paymentReference = $derived($cartState.lastCheckout?.paymentReference ?? null);
  const basketId = $derived($cartState.basket?.basketId ?? null);
  // payDisabled is computed below once preparePaymentAction is in scope

  // Do NOT include orderKey in any QR codes or UI. Prefer non-secret paymentReference.
  const paymentQrValue = $derived(
    paymentReference
      ? `circles:payment:${paymentReference}`
      : basketId
      ? `circles:basket:${basketId}`
      : 'circles:payment'
  );

  function openTransferFlow(): void {
    if (!transferContext) return;
    openStep({
      title: 'Pay with Circles',
      component: SendFlow,
      props: { context: transferContext },
    });
  }
</script>

<FlowStepScaffold
  {...CHECKOUT_FLOW_SCAFFOLD_BASE}
  step={5}
  title="Payment"
  subtitle="Complete payment by QR or in-app transfer."
>

  <div style="display:flex;flex-direction:column;gap:14px;">
    <!-- Hero QR card -->
    <div style="
      background:{T.ink};color:{T.butter};border-radius:22px;overflow:hidden;
      padding:24px 22px;display:flex;flex-direction:column;align-items:center;gap:14px;
    ">
      <div style="background:#fff;border-radius:14px;padding:16px;display:inline-flex;">
        <QrCode value={paymentQrValue} />
      </div>

      {#if paymentReference}
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <span style="font-size:10px;font-weight:600;color:rgba(251,227,216,0.7);letter-spacing:0.06em;text-transform:uppercase;">Payment reference</span>
          <code style="font-family:{T.fontMono};font-size:11px;color:rgba(251,227,216,0.85);text-align:center;word-break:break-all;max-width:280px;line-height:1.5;">{paymentReference}</code>
        </div>
      {/if}

      <span style="font-size:11px;color:rgba(251,227,216,0.55);text-align:center;line-height:1.5;max-width:280px;">
        Scan this code with the Circles app to pay.
      </span>
    </div>

    <!-- "or" divider -->
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="height:1px;background:{T.hairlineSoft};flex:1;"></div>
      <span style="font-size:10px;color:{T.inkMuted};font-weight:540;letter-spacing:0.06em;text-transform:uppercase;">or</span>
      <div style="height:1px;background:{T.hairlineSoft};flex:1;"></div>
    </div>

    <!-- In-app transfer card -->
    <div style="display:flex;flex-direction:column;gap:10px;">
      {#if preparePaymentAction.error}
        <StepAlert variant="warning" message={preparePaymentAction.error} />
      {/if}

      {#if chainWarning}
        <StepAlert variant="info" message={chainWarning} />
      {/if}


      {#if transferContext}
        <div style="
          background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:14px;
          padding:12px 14px;display:flex;flex-direction:column;gap:4px;
        ">
          <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Send</span>
          <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;">
            <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.01em;line-height:1;">{transferContext.amount}</span>
            <span style="font-size:11px;color:{T.inkMuted};">CRC</span>
            <span style="font-size:11.5px;color:{T.inkMuted};">to</span>
            <code style="font-family:{T.fontMono};font-size:11.5px;color:{T.inkBody};word-break:break-all;">{String(transferContext.selectedAddress).slice(0, 14)}…{String(transferContext.selectedAddress).slice(-4)}</code>
          </div>
        </div>
      {/if}

      <button
        type="button"
        style="
          height:48px;padding:0 24px;border-radius:9999px;border:0;cursor:{(!transferContext || preparePaymentAction.loading) ? 'not-allowed' : 'pointer'};
          background:{(!transferContext || preparePaymentAction.loading) ? T.pageDeep : T.primary};color:{(!transferContext || preparePaymentAction.loading) ? T.inkMuted : '#fff'};
          font-family:{T.fontSans};font-size:14px;font-weight:580;
          box-shadow:{(!transferContext || preparePaymentAction.loading) ? 'none' : '0 6px 16px rgba(88,73,212,0.3)'};
          display:inline-flex;align-items:center;justify-content:center;gap:8px;
          width:100%;
        "
        disabled={!transferContext || preparePaymentAction.loading}
        onclick={openTransferFlow}
      >
        {#if preparePaymentAction.loading}<svg class="checkoutpayment-spin" style="width:14px;height:14px;color:#fff;" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/></svg>{/if}
        {preparePaymentAction.loading ? 'Preparing path…' : 'Pay with Circles in-app'}
      </button>
    </div>
  </div>
  </FlowStepScaffold>

<style>
@keyframes checkoutpayment-spin{from{}to{transform:rotate(360deg)}}.checkoutpayment-spin{animation:checkoutpayment-spin 0.8s linear infinite;}
</style>
