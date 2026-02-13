<script lang="ts">
  import {
    cartState,
    previewCartOrder,
    removeLineByIdentity,
    setLineQuantityByIdentity,
    validateCart,
  } from '$lib/areas/market/cart/store';
  import type {AggregatedCatalogItem} from '$lib/areas/market/model';
  import { openStep } from '$lib/shared/flow/runtime';
  import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
  import {pickFirstProductImageUrl} from '$lib/areas/market/services';
  import CheckoutForms from '$lib/areas/market/flows/checkout/CheckoutForms.svelte';
  import CheckoutReview from '$lib/areas/market/flows/checkout/CheckoutReview.svelte';
  import {formatCurrency} from '$lib/shared/utils/money';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import FlowStepHeader from '$lib/shared/ui/flow/FlowStepHeader.svelte';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import {gnosisConfig} from "$lib/shared/config/circles";

  // ————————————————————————————————————————————
  // Product metadata resolver via shared catalog client
  // ————————————————————————————————————————————
  type ProductKey = string;
  function productKey(seller: string | undefined, sku: string | undefined): ProductKey | null {
    if (!seller || !sku) return null;
    return `${seller.toLowerCase()}::${sku.toLowerCase()}`;
  }

  // key -> AggregatedCatalogItem | null (null: failed/not found)
  let resolvedProducts: Record<ProductKey, AggregatedCatalogItem | null> = $state({});
  let resolvingKeys: Set<ProductKey> = new Set();

  function findCatalogItem(
    seller: string | undefined,
    sku: string | undefined,
  ): AggregatedCatalogItem | undefined {
    const key = productKey(seller, sku);
    if (!key) return undefined;
    const entry = resolvedProducts[key];
    return entry ?? undefined;
  }

  function imageUrlForLine(line: any): string | null {
  const direct = typeof line?.imageUrl === 'string' ? line.imageUrl.trim() : '';
  if (direct) return direct;

  const item = findCatalogItem(
    line?.seller as string | undefined,
    line?.orderedItem?.sku as string | undefined
  );
  if (!item) return null;

  return pickFirstProductImageUrl(item.product);
}

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

    await setLineQuantityByIdentity(seller, sku, q);
  }

  function onQtyChange(idx: number, e: Event): void {
    const val = (e.currentTarget as HTMLInputElement).value;
    void handleQuantityChange(idx, val);
  }

  async function handleRemove(itemIdx: number): Promise<void> {
    const basket = $cartState.basket;
    const line = basket?.items?.[itemIdx];
    if (!line) {
      return;
    }

    const seller = line.seller;
    const sku = line.orderedItem?.sku;

    if (!seller || !sku) {
      console.warn('[cart] line has no seller/sku; cannot remove', { line, itemIdx });
      return;
    }

    await removeLineByIdentity(seller, sku);
  }

  // Lazily fetch missing products for each line in basket
  $effect(() => {
    const items = $cartState.basket?.items ?? [];
    const catalog = getMarketClient().catalog.forOperator(gnosisConfig.production.marketOperator);
    for (const line of items) {
      const seller = line.seller as string | undefined;
      const sku = line.orderedItem?.sku as string | undefined;
      const key = productKey(seller, sku);
      if (!key) continue;

      const alreadyKnown = Object.prototype.hasOwnProperty.call(resolvedProducts, key);
      const alreadyResolving = resolvingKeys.has(key);
      if (alreadyKnown || alreadyResolving) continue;

      resolvingKeys.add(key);
      resolvedProducts = { ...resolvedProducts, [key]: null };

      void (async () => {
        try {
          const item = await catalog.fetchProductForSellerAndSku(seller as string, sku as string);
          resolvedProducts = { ...resolvedProducts, [key]: item };
        } catch {
          resolvedProducts = { ...resolvedProducts, [key]: null };
        } finally {
          resolvingKeys.delete(key);
        }
      })();
    }
  });

  function hasRequirements(v: any): boolean {
    if (!v || !Array.isArray(v.requirements)) return false;
    return v.requirements.length > 0;
  }

  async function openCheckoutFlow(): Promise<void> {
    try {
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
    } catch (e) {
      // In case of error, still allow the user to proceed to address step to resolve issues
      console.warn('[cart] validate before checkout failed; opening details step', e);
      openStep({
        title: 'Additional details',
        component: CheckoutForms,
        props: {},
      });
    }
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

<FlowDecoration size="xl">
<div class="w-full space-y-4" tabindex="-1" data-popup-initial-focus>
  <FlowStepHeader
    step={1}
    total={4}
    title="Cart"
    subtitle="Review basket items before checkout."
    labels={['Cart', 'Details', 'Review', 'Payment']}
  />

  <!-- Title and close button are provided by the popup shell; remove duplicates here -->

  {#if $cartState.lastError}
    <StepAlert variant="error" className="text-xs" message={$cartState.lastError} />
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
            $cartState.loading ||
            !$cartState.basket ||
            !$cartState.basket.items ||
            $cartState.basket.items.length === 0 ||
            isCheckedOut
          }
        >
          Checkout
        </button>
      {/snippet}
    </StepActionBar>
  {/if}
</div>
</FlowDecoration>
