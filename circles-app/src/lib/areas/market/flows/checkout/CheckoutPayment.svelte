<!-- lib/flows/checkout/CheckoutPayment.svelte -->
<script lang="ts">
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { CHECKOUT_FLOW_SCAFFOLD_BASE } from './constants';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import QrCode from '$lib/shared/ui/primitives/QrCode.svelte';
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

  <div class="space-y-3 text-xs">
    <StepAlert variant="info">
      <span>
        Scan this QR code with the Circles app to execute the payment.
        (Mock only – payload: <code>{paymentQrValue}</code>).
      </span>
    </StepAlert>

    <div class="flex justify-center">
      <QrCode value={paymentQrValue} />
    </div>

    {#if paymentReference}
      <div class="mt-2 text-xs opacity-70 text-center">
        Payment reference: <code>{paymentReference}</code>
      </div>
    {/if}

    <!-- Divider -->
    <div class="divider text-xs">or</div>

    <!-- In-app transfer option -->
    <div class="flex flex-col items-end gap-2">
      {#if chainWarning}
        <StepAlert variant="info" className="text-xs w-full" message={chainWarning} />
      {/if}

      <StepActionBar>
        {#snippet primary()}
          <button
            class="btn btn-primary btn-sm"
            disabled={!transferContext}
            onclick={openTransferFlow}
          >
            Pay with Circles (in-app transfer)
          </button>
        {/snippet}
      </StepActionBar>

      {#if transferContext}
        <div class="text-[11px] opacity-70 text-right">
          Will send <strong>{transferContext.amount}</strong> CRC to
          <code class="break-all">{transferContext.selectedAddress}</code>
          {#if paymentReference}
            with data <code>{paymentReference}</code>
          {/if}
        </div>
      {/if}
    </div>
  </div>
  </FlowStepScaffold>
