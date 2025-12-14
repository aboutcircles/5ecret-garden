<!-- lib/flows/checkout/CheckoutPayment.svelte -->
<script lang="ts">
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import QrCode from '$lib/components/QrCode.svelte';
  import { cartState } from '$lib/cart/store';

  // NEW: imports to resolve PayAction and open send flow (Svelte 5 runes aware)
  import { getMarketClient } from '$lib/sdk/marketClient';
  import { MARKET_OPERATOR } from '$lib/config/market';
  import { resolvePayTo } from '$lib/market/catalogHelpers';
  import { popupControls } from '$lib/stores/popup';
  import SendFlow from '$lib/flows/send/4_Send.svelte';
  import { transitiveTransfer } from '$lib/pages/SelectAsset.svelte';
  import type { SendFlowContext } from '$lib/flows/send/context';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { circles } from '$lib/stores/circles';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { ethers } from 'ethers';
  import { CirclesConverter } from '@circles-sdk/utils';

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

  let resolving = $state(false);
  let resolveError: string | null = $state(null);
  let chainWarning: string | null = $state(null);
  let transferContext: SendFlowContext | null = $state(null);
  let payActionChainId: number | null = $state(null);
  let currentChainId: number | null = $state(null);

  // Determine current wallet network chainId
  $effect(async () => {
    const w = $wallet;
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
      currentChainId = null;
    }
  });

  let buildSeq = 0;

  async function buildTransferContext(): Promise<void> {
  const mySeq = ++buildSeq;

  resolveError = null;
  chainWarning = null;
  transferContext = null;
  payActionChainId = null;

  if (!lines?.length) {
    return;
  }

  if (!paymentReference) {
    resolveError = 'Payment reference not available yet. Please wait a moment and try again.';
    return;
  }

  resolving = true;

  try {
    const recipients = new Set<string>();
    let total = 0;

    const catalog = getMarketClient().catalog.forOperator(MARKET_OPERATOR);
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
      } catch {
        productCache.set(key, null);
        return null;
      }
    }

    for (const line of lines) {
      if (mySeq !== buildSeq) return;

      const seller = String(line?.seller ?? '');
      const sku = String(line?.orderedItem?.sku ?? '');
      if (!seller || !sku) {
        resolveError = 'Incomplete line item (seller/SKU missing).';
        return;
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
        if (mySeq !== buildSeq) return;
        payTo = resolvePayTo(offerFallback);
      }

      if (payActionChainId == null && typeof payTo.chainId === 'number') {
        payActionChainId = payTo.chainId;
      }

      const unitPrice = snapPrice ?? payTo.price ?? null;
      const code = (snapCurrency ?? payTo.priceCurrency ?? null) as string | null;

      if (!payTo?.address) {
        resolveError = 'Missing pay-to address on offer.';
        return;
      }
      if (unitPrice == null || !Number.isFinite(unitPrice)) {
        resolveError = 'Missing or invalid price for an item.';
        return;
      }
      if (!code || code.toUpperCase() !== 'CRC') {
        resolveError = `Unsupported currency ${code || '(none)'} – only CRC supported for in-app transfer.`;
        return;
      }

      recipients.add((payTo.address as string).toLowerCase());
      total += unitPrice * qty;
    }

    if (mySeq !== buildSeq) return;

    if (recipients.size !== 1) {
      resolveError = 'Items have different payment recipients; please pay them separately.';
      return;
    }

    if (payActionChainId && currentChainId && payActionChainId !== currentChainId) {
      chainWarning = `Network mismatch: Offer requests chain ${payActionChainId}, but wallet is on ${currentChainId}.`;
    }

    const to = Array.from(recipients)[0] as any;

    if (!$circles || !avatarState.avatar) {
      resolveError = 'Wallet not ready for pathfinding.';
      return;
    }

    const excludedTokens = await $circles.getDefaultTokenExcludeList(to);
    if (mySeq !== buildSeq) return;

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

    if (mySeq !== buildSeq) return;

    if (!p || !p.transfers?.length) {
      resolveError = 'Pathfinding failed. No usable path was found.';
      return;
    }

    let maxAmountCircles = parseFloat(ethers.formatEther(p.maxFlow.toString()));
    if (avatarState.avatar?.avatarInfo?.version === 1) {
      const attoCircles = CirclesConverter.attoCrcToAttoCircles(BigInt(p.maxFlow), BigInt(Date.now() / 1000));
      maxAmountCircles = CirclesConverter.attoCirclesToCircles(attoCircles);
    }

    if (maxAmountCircles <= 0 || total > maxAmountCircles) {
      resolveError = `Insufficient path capacity. Max transferable is ${maxAmountCircles}, but required is ${total}.`;
      return;
    }

    transferContext = {
      selectedAddress: to,
      selectedAsset: transitiveTransfer(),
      transitiveOnly: true,
      amount: total,
      data: paymentReference ?? undefined,
      dataType: 'utf-8',
    };
  } catch (e) {
    if (mySeq !== buildSeq) return;
    resolveError = e instanceof Error ? e.message : 'Failed to resolve payment details';
  } finally {
    if (mySeq === buildSeq) {
      resolving = false;
    }
  }
}

  function openTransferFlow(): void {
    if (!transferContext) return;
    popupControls.open({
      title: 'Pay with Circles',
      component: SendFlow,
      props: { context: transferContext },
    });
  }

  // Resolve once on mount (or re-run if basket or paymentReference changes)
  $effect(() => {
    void buildTransferContext();
  });
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

    <!-- Divider -->
    <div class="divider text-xs">or</div>

    <!-- In-app transfer option -->
    <div class="flex flex-col items-center gap-2">
      {#if resolveError}
        <div class="alert alert-warning text-xs w-full max-w-md">{resolveError}</div>
      {/if}

      {#if chainWarning}
        <div class="alert alert-info text-xs w-full max-w-md">{chainWarning}</div>
      {/if}

      <button
        class="btn btn-primary btn-sm"
        disabled={!transferContext || resolving}
        onclick={openTransferFlow}
      >
        {resolving ? 'Preparing…' : 'Pay with Circles (in-app transfer)'}
      </button>

      {#if transferContext}
        <div class="text-[11px] opacity-70 text-center">
          Will send <strong>{transferContext.amount}</strong> CRC to
          <code class="break-all">{transferContext.selectedAddress}</code>
          {#if paymentReference}
            with data <code>{paymentReference}</code>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</FlowDecoration>
