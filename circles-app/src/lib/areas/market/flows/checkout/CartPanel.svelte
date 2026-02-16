<script lang="ts">
  import {
    cartState,
    previewCartOrder,
    updateLineByIdentity,
    validateCart,
  } from '$lib/areas/market/cart/store';
  import { openStep, useAsyncAction } from '$lib/shared/flow';
  import {pickFirstProductImageUrl} from '$lib/areas/market/services';
  import CheckoutForms from '$lib/areas/market/flows/checkout/CheckoutForms.svelte';
  import CheckoutReview from '$lib/areas/market/flows/checkout/CheckoutReview.svelte';
  import {formatCurrency} from '$lib/shared/utils/money';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import { CHECKOUT_FLOW_SCAFFOLD_BASE } from './constants';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { resetResolvedProductsCache, useResolvedProducts } from '$lib/areas/market/flows/checkout/useResolvedProducts';

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

  function onQtyChange(idx: number, e: Event): void {
    const val = (e.currentTarget as HTMLInputElement).value;
    void handleQuantityChange(idx, val);
  }

  function handleRemove(itemIdx: number): void {
    void handleQuantityChange(itemIdx, "0");
  }

  $effect(() => {
    if (!$cartState.basket || !$cartState.basket.items || $cartState.basket.items.length === 0) {
      resetResolvedProductsCache();
    }
  });

  const { findCatalogItem, imageUrlForLine } = useResolvedProducts(($cartState.basket?.items ?? []) as any[]);

  function hasRequirements(v: any): boolean {
    if (!v || !Array.isArray(v.requirements)) return false;
    return v.requirements.length > 0;
  }

  const checkoutAction = useAsyncAction(async () => {
    const v = await validateCart();
    if (hasRequirements(v)) {
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
    <div class="p-4 text-sm opacity-70">
      Your basket is empty.
    </div>
  {:else}
    <div class="space-y-2">
      {#each $cartState.basket.items as line, i}
        <div class="flex items-start justify-between gap-3 border border-base-300 rounded-md px-3 py-2">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-14 h-14 rounded bg-base-200 overflow-hidden shrink-0 flex items-center justify-center">
              {#if imageUrlForLine(line)}
                <img src={imageUrlForLine(line) || ''} alt={findCatalogItem(line.seller, line.orderedItem.sku)?.product.name || 'product-image'} class="w-14 h-14 object-cover" loading="lazy" />
              {:else}
                <span class="text-[10px] opacity-60">No image</span>
              {/if}
            </div>

            <div class="min-w-0">
              <div class="font-semibold truncate">
                {findCatalogItem(line.seller, line.orderedItem.sku)?.product.name
                  ?? line.orderedItem.sku}
              </div>
              <div class="text-xs opacity-70 truncate">
                Seller: {line.seller}
              </div>
              {#if line.offerSnapshot}
                <div class="text-xs mt-1">
                  Price:&nbsp;
                  {formatCurrency(
                    line.offerSnapshot?.price ?? null,
                    line.offerSnapshot?.priceCurrency ?? null,
                  )}
                </div>
              {/if}
            </div>
          </div>

          <div class="flex flex-col items-end gap-1">
            <input
              type="number"
              min="0"
              class="input input-xs input-bordered w-20 text-right"
              value={line.orderQuantity}
              onchange={(e) => onQtyChange(i, e)}
              disabled={isCheckedOut}
            />
            <button
              type="button"
              class="btn btn-xs btn-ghost text-error"
              onclick={() => handleRemove(i)}
              disabled={isCheckedOut}
            >
              Remove
            </button>
          </div>
        </div>
      {/each}
    </div>

    <!-- totals -->
    <div class="mt-3 border-t border-base-300 pt-3 text-sm space-y-1">
      {#if perCurrency.size === 0}
        <div class="opacity-70">No priced items.</div>
      {:else}
        {#each Array.from(perCurrency.entries()) as [code, total]}
          <div class="flex justify-between">
            <span>Total {#if code}( {code} ){/if}</span>
            <span class="font-semibold">{total.toFixed(2)} {code}</span>
          </div>
        {/each}
      {/if}
    </div>

    {#if $cartState.basket?.status === 'CheckedOut' && $cartState.lastCheckout?.paymentReference}
      <div class="mt-3 alert alert-success text-xs">
        <span>Payment reference:</span>
        <code class="ml-1 break-all">{$cartState.lastCheckout.paymentReference}</code>
      </div>
    {/if}

  <StepActionBar>
    {#snippet primary()}
      <button
        type="button"
        class="btn btn-sm btn-primary"
        onclick={() => openCheckoutFlow()}
        disabled={
          checkoutAction.loading ||
          $cartState.loading ||
          !$cartState.basket ||
          !$cartState.basket.items ||
          $cartState.basket.items.length === 0 ||
          isCheckedOut
        }
      >
        {checkoutAction.loading ? 'Checking...' : 'Checkout'}
      </button>
    {/snippet}
  </StepActionBar>
  {/if}
</FlowStepScaffold>
