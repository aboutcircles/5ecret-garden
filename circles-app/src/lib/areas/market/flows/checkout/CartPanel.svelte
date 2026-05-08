<script lang="ts">
  import {
    cartState,
    previewCartOrder,
    updateLineByIdentity,
    validateCart,
  } from '$lib/areas/market/cart/store';
  import { openStep, useAsyncAction } from '$lib/shared/flow';
  import CheckoutForms from '$lib/areas/market/flows/checkout/CheckoutForms.svelte';
  import CheckoutReview from '$lib/areas/market/flows/checkout/CheckoutReview.svelte';
  import {formatCurrency} from '$lib/shared/utils/money';
  import OrderLineTable from './OrderLineTable.svelte';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import { CHECKOUT_FLOW_SCAFFOLD_BASE } from './constants';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { resetResolvedProductsCache, useResolvedProducts } from '$lib/areas/market/flows/checkout/useResolvedProducts';
  import { T } from '$lib/design-system/tokens.js';

  async function handleQuantityChange(
    itemIdx: number,
    quantityStr: string,
  ): Promise<void> {
    const parsed = Number(quantityStr);
    const isInvalid = !Number.isFinite(parsed) || parsed < 0;
    if (isInvalid) {
      return;
    }

    const q = parsed;

    const basket = $cartState.basket;
    const line = basket?.items?.[itemIdx];
    if (!line) {
      return;
    }

    const seller = line.seller;
    const sku = line.orderedItem?.sku;

    if (!seller || !sku) {
      // If we ever hit this, the basket is malformed. Log, but don't try any other path.
      console.warn('[cart] line has no seller/sku; cannot update quantity', { line, itemIdx });
      return;
    }

    await updateLineByIdentity(seller, sku, q);
  }

  function handleRemove(itemIdx: number): void {
    void handleQuantityChange(itemIdx, "0");
  }

  $effect(() => {
    if (!$cartState.basket || !$cartState.basket.items || $cartState.basket.items.length === 0) {
      resetResolvedProductsCache();
    }
  });

  const cartLines = $derived(($cartState.basket?.items ?? []) as any[]);
  const { findCatalogItem, imageUrlForLine } = useResolvedProducts(cartLines);

  function hasBlockingRequirements(v: any): boolean {
    if (!v || !Array.isArray(v.requirements)) return false;
    return v.requirements.some(
      (r: any) => !!r?.blocking && (r?.status ?? '').toString() !== 'ok',
    );
  }

  const checkoutAction = useAsyncAction(async () => {
    const v = await validateCart();
    if (hasBlockingRequirements(v)) {
      openStep({
        title: 'Additional details',
        component: CheckoutForms,
        props: {},
      });
      return;
    }
    await previewCartOrder();
    openStep({
      title: 'Review order',
      component: CheckoutReview,
      props: {},
    });
  }, {
    onError: (e) => {
      // In case of error, still allow the user to proceed to address step to resolve issues
      console.warn('[cart] validate before checkout failed; opening details step', e);
      openStep({
        title: 'Additional details',
        component: CheckoutForms,
        props: {},
      });
    }
  });

  async function openCheckoutFlow(): Promise<void> {
    await checkoutAction.run();
  }

  // Derive simple totals per currency from server-managed offer snapshots on
  // basket lines. This is for immediate UI feedback; the server remains
  // authoritative (preview/checkout use canonical data).
  const perCurrency = $derived.by(() => {
    const basket = $cartState.basket;
    const out = new Map<string, number>();

    if (!basket?.items) return out;

    for (const line of basket.items) {
      const snap = line.offerSnapshot;
      const price = snap?.price as number | null | undefined;
      const code = (snap?.priceCurrency ?? '') as string;
      if (price == null || !Number.isFinite(Number(price))) continue;
      const qty = Number(line.orderQuantity || 0) || 0;
      const key = code || '';
      const current = out.get(key) ?? 0;
      out.set(key, current + Number(price) * qty);
    }

    return out;
  });

  // Whether the current basket has been checked out
  const isCheckedOut = $derived.by(() => $cartState.basket?.status === 'CheckedOut');

  const checkoutDisabled = $derived(
    checkoutAction.loading ||
    $cartState.loading ||
    !$cartState.basket ||
    !$cartState.basket.items ||
    $cartState.basket.items.length === 0 ||
    isCheckedOut
  );
</script>

<FlowStepScaffold
  {...CHECKOUT_FLOW_SCAFFOLD_BASE}
  size="xl"
  step={1}
  title="Cart"
  subtitle="Review basket items before checkout."
>

  <!-- Title and close button are provided by the popup shell; remove duplicates here -->

  {#if $cartState.lastError}
    <StepAlert variant="error" className="text-xs" message={$cartState.lastError} />
  {/if}

  {#if checkoutAction.error}
    <StepAlert variant="error" className="text-xs" message={checkoutAction.error} />
  {/if}

  {#if !$cartState.basket || !$cartState.basket.items || $cartState.basket.items.length === 0}
    <div style="
      background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:14px;
      padding:24px;font-size:13px;color:{T.inkMuted};text-align:center;
    ">
      Your basket is empty.
    </div>
  {:else}
    <OrderLineTable
      lines={cartLines}
      {findCatalogItem}
      {imageUrlForLine}
      getLineQuantity={(line) => Number(line?.orderQuantity ?? 0)}
      getLineUnitPrice={(line) => ({
        amount: typeof line?.offerSnapshot?.price === 'number' ? line.offerSnapshot.price : null,
        code: typeof line?.offerSnapshot?.priceCurrency === 'string' ? line.offerSnapshot.priceCurrency : null,
      })}
      getLineTotal={(line) => ({
        amount: typeof line?.offerSnapshot?.price === 'number'
          ? (line.offerSnapshot.price * Number(line?.orderQuantity ?? 0))
          : null,
        code: typeof line?.offerSnapshot?.priceCurrency === 'string' ? line.offerSnapshot.priceCurrency : null,
      })}
      editable={!isCheckedOut}
      onQuantityChange={(idx, value) => {
        void handleQuantityChange(idx, value);
      }}
      onRemove={handleRemove}
    />

    <!-- Totals card -->
    <div style="
      background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:14px;
      padding:12px 14px;display:flex;flex-direction:column;gap:6px;
    ">
      {#if perCurrency.size === 0}
        <div style="font-size:12.5px;color:{T.inkMuted};">No priced items.</div>
      {:else}
        {#each Array.from(perCurrency.entries()) as [code, total]}
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <span style="font-size:12.5px;color:{T.inkMuted};">Total{#if code} ({code}){/if}</span>
            <span style="font-family:{T.fontDisplay};font-size:18px;color:{T.ink};letter-spacing:-0.01em;">
              {total.toFixed(2)} <span style="font-family:{T.fontSans};font-size:12px;color:{T.inkMuted};font-weight:540;">{code}</span>
            </span>
          </div>
        {/each}
      {/if}
    </div>

    {#if $cartState.basket?.status === 'CheckedOut' && $cartState.lastCheckout?.paymentReference}
      <div style="
        background:{T.sageSoft};border:1px solid rgba(45,138,82,0.18);border-radius:12px;
        padding:10px 14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;
        font-size:11.5px;color:{T.inkBody};
      ">
        <span style="font-weight:540;">Payment reference:</span>
        <code style="font-family:{T.fontMono};font-size:11px;color:{T.ink};word-break:break-all;">{$cartState.lastCheckout.paymentReference}</code>
      </div>
    {/if}

    <div style="display:flex;justify-content:flex-end;margin-top:4px;">
      <button
        type="button"
        style="
          height:44px;padding:0 24px;border-radius:9999px;border:0;cursor:{checkoutDisabled ? 'not-allowed' : 'pointer'};
          background:{checkoutDisabled ? T.pageDeep : T.primary};color:{checkoutDisabled ? T.inkMuted : '#fff'};
          font-family:{T.fontSans};font-size:14px;font-weight:580;
          box-shadow:{checkoutDisabled ? 'none' : '0 4px 12px rgba(88,73,212,0.25)'};
          display:inline-flex;align-items:center;gap:8px;
        "
        onclick={() => openCheckoutFlow()}
        disabled={checkoutDisabled}
      >
        {#if checkoutAction.loading}<span class="loading loading-spinner loading-xs"></span>{/if}
        {checkoutAction.loading ? 'Checking…' : 'Checkout'}
      </button>
    </div>
  {/if}
</FlowStepScaffold>
