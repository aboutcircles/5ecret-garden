<!-- lib/flows/checkout/CheckoutPayment.svelte -->
<script lang="ts">
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { CHECKOUT_FLOW_SCAFFOLD_BASE } from './constants';
  import QrCode from '$lib/shared/ui/primitives/QrCode.svelte';
  import { T } from '$lib/design-system/tokens.js';
  import { cartState } from '$lib/areas/market/cart/store';

  // NEW: imports to resolve PayAction and open send flow (Svelte 5 runes aware)
  import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
  import { resolvePayTo } from '$lib/areas/market/services';
  import { popupControls } from '$lib/shared/state/popup';
  import { openStep, useAsyncAction } from '$lib/shared/flow';
  import SendFlow from '$lib/areas/wallet/flows/send/4_Send.svelte';
  import { transitiveTransfer } from '$lib/areas/wallet/ui/pages/SelectAsset.svelte';
  import type { SendFlowContext } from '$lib/areas/wallet/flows/send/context';
  import { wallet } from '$lib/shared/state/wallet.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { ethers } from 'ethers';
  import { CirclesConverter } from '@circles-sdk/utils';
  import {gnosisConfig} from "$lib/shared/config/circles";

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

  // --- Derive transfer context ---
  const basket = $derived($cartState.basket);
  const lines = $derived((basket?.items ?? []) as any[]);

  let chainWarning: string | null = $state(null);
  let transferContext: SendFlowContext | null = $state(null);
  let payActionChainId: number | null = $state(null);
  let currentChainId: number | null = $state(null);

  // Determine current wallet network chainId
  $effect(() => {
    void (async () => {
      const w = $wallet as any;
      if (!w) {
        currentChainId = null;
        return;
      }
      try {
        const net = await w.provider.getNetwork();
        // ethers v6 returns bigint chainId; normalize to number
        const cid = Number(net?.chainId);
        currentChainId = Number.isFinite(cid) ? cid : null;
      } catch (e) {
        console.debug('[checkout] failed to read wallet network', e);
        currentChainId = null;
      }
    })();
  });

  const preparePaymentAction = useAsyncAction(async () => {
    if (!lines?.length) {
      return;
    }

    if (!paymentReference) {
      throw new Error('Payment reference not available yet. Please wait a moment and try again.');
    }

    const recipients = new Set<string>();
    let total = 0;

    const operator = gnosisConfig.production.marketOperator as any;
    const catalog = getMarketClient().catalog.forOperator(operator);
    const productCache = new Map<string, any>();

    async function fetchOfferFallback(seller: string, sku: string): Promise<any | null> {
      const key = `${seller.toLowerCase()}::${sku.toLowerCase()}`;
      const cached = productCache.get(key);
      if (cached !== undefined) return cached;

      try {
        const item = await catalog.fetchProductForSellerAndSku(seller, sku);
        const prod = (item as any)?.product;
        const offer =
          Array.isArray(prod?.offers) ? prod.offers[0] :
          prod?.offer ??
          (Array.isArray(prod?.Offers) ? prod.Offers[0] : prod?.Offer);

        productCache.set(key, offer ?? null);
        return offer ?? null;
      } catch (e) {
        console.debug('[checkout] failed to resolve offer from catalog', { seller, sku }, e);
        productCache.set(key, null);
        return null;
      }
    }

    for (const line of lines) {
      const seller = String(line?.seller ?? '');
      const sku = String(line?.orderedItem?.sku ?? '');
      if (!seller || !sku) {
        throw new Error('Incomplete line item (seller/SKU missing).');
      }

      const qtyRaw = Number(line?.orderQuantity ?? 1);
      const qtyOk = Number.isFinite(qtyRaw) && qtyRaw > 0;
      const qty = qtyOk ? qtyRaw : 1;

      const snap = line?.offerSnapshot;
      const snapPrice = typeof snap?.price === 'number' ? snap.price : null;
      const snapCurrency = typeof snap?.priceCurrency === 'string' ? snap.priceCurrency : null;

      let payTo = resolvePayTo(snap);

      const needsOfferFallback = !payTo?.address;
      if (needsOfferFallback) {
        const offerFallback = await fetchOfferFallback(seller, sku);
        payTo = resolvePayTo(offerFallback);
      }

      if (payActionChainId == null && typeof payTo.chainId === 'number') {
        payActionChainId = payTo.chainId;
      }

      const unitPrice = snapPrice ?? payTo.price ?? null;
      const code = (snapCurrency ?? payTo.priceCurrency ?? null) as string | null;

      if (!payTo?.address) {
        throw new Error('Missing pay-to address on offer.');
      }
      if (unitPrice == null || !Number.isFinite(unitPrice)) {
        throw new Error('Missing or invalid price for an item.');
      }
      if (!code || code.toUpperCase() !== 'CRC') {
        throw new Error(`Unsupported currency ${code || '(none)'} – only CRC supported for in-app transfer.`);
      }

      recipients.add((payTo.address as string).toLowerCase());
      total += unitPrice * qty;
    }

    if (recipients.size !== 1) {
      throw new Error('Items have different payment recipients; please pay them separately.');
    }

    if (payActionChainId && currentChainId && payActionChainId !== currentChainId) {
      chainWarning = `Network mismatch: Offer requests chain ${payActionChainId}, but wallet is on ${currentChainId}.`;
    }

    const to = Array.from(recipients)[0] as any;

    if (!$circles || !avatarState.avatar) {
      throw new Error('Wallet not ready for pathfinding.');
    }

    const excludedTokens = await $circles.getDefaultTokenExcludeList(to);

    const bigNumber = '99999999999999999999999999999999999';
    const p =
      avatarState.avatar?.avatarInfo?.version === 1
        ? await $circles.v1Pathfinder?.getPath(avatarState.avatar.address, to, bigNumber)
        : await $circles.v2Pathfinder?.getPath(
            avatarState.avatar.address,
            to,
            bigNumber,
            true,
            undefined,
            undefined,
            excludedTokens
          );

    if (!p || !p.transfers?.length) {
      throw new Error('Pathfinding failed. No usable path was found.');
    }

    let maxAmountCircles = parseFloat(ethers.formatEther(p.maxFlow.toString()));
    if (avatarState.avatar?.avatarInfo?.version === 1) {
      const attoCircles = CirclesConverter.attoCrcToAttoCircles(BigInt(p.maxFlow), BigInt(Date.now() / 1000));
      maxAmountCircles = CirclesConverter.attoCirclesToCircles(attoCircles);
    }

    if (maxAmountCircles <= 0 || total > maxAmountCircles) {
      throw new Error(`Insufficient path capacity. Max transferable is ${maxAmountCircles}, but required is ${total}.`);
    }

    transferContext = {
      selectedAddress: to,
      selectedAsset: transitiveTransfer(),
      transitiveOnly: true,
      amount: total,
      data: paymentReference ?? undefined,
      dataType: 'utf-8',
    };
  });

  function openTransferFlow(): void {
    if (!transferContext) return;
    openStep({
      title: 'Pay with Circles',
      component: SendFlow,
      props: { context: transferContext },
    });
  }

  let lastPreparedFor: string | null = null;

  // Resolve once on mount (or re-run if basket or paymentReference changes)
  $effect(() => {
    const b = $cartState.basket as any;
    const basketId = b?.['@id'];
    const currentKey = `${basketId}:${paymentReference}`;
    if (!paymentReference || preparePaymentAction.loading || lastPreparedFor === currentKey) return;

    lastPreparedFor = currentKey;
    chainWarning = null;
    transferContext = null;
    payActionChainId = null;
    void preparePaymentAction.run();
  });
</script>

<FlowStepScaffold
  {...CHECKOUT_FLOW_SCAFFOLD_BASE}
  step={4}
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

      {@const disabled = !transferContext || preparePaymentAction.loading}
      <button
        type="button"
        style="
          height:48px;padding:0 24px;border-radius:9999px;border:0;cursor:{disabled ? 'not-allowed' : 'pointer'};
          background:{disabled ? T.pageDeep : T.primary};color:{disabled ? T.inkMuted : '#fff'};
          font-family:{T.fontSans};font-size:14px;font-weight:580;
          box-shadow:{disabled ? 'none' : '0 6px 16px rgba(88,73,212,0.3)'};
          display:inline-flex;align-items:center;justify-content:center;gap:8px;
          width:100%;
        "
        {disabled}
        onclick={openTransferFlow}
      >
        {#if preparePaymentAction.loading}<span class="loading loading-spinner loading-xs"></span>{/if}
        {preparePaymentAction.loading ? 'Preparing path…' : 'Pay with Circles in-app'}
      </button>
    </div>
  </div>
  </FlowStepScaffold>
