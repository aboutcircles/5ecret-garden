<script lang="ts">
  import {
    cartState,
    setLineQuantityByIdentity,
    removeLineByIdentity,
    validateCart,
    previewCartOrder,
    checkoutCart,
    updateBasketDetails,
  } from '$lib/cart/store';
  import type { AggregatedCatalogItem } from '$lib/market/types';
  import { popupControls } from '$lib/stores/popUp';

  type Props = {
    // Optional: if we want to pass a lightweight "catalog" to resolve names by sku
    catalog?: AggregatedCatalogItem[];
  };

  let { catalog = [] }: Props = $props();

  // Removed unused SCOPE_CHAIN_ID

  let localError = $state<string | null>(null);
  let validating = $state(false);
  let previewing = $state(false);
  let checkingOut = $state(false);

  // Shipping/contact/age form state
  let shippingStreet = $state('');
  let shippingLocality = $state('');
  let shippingPostal = $state('');
  let shippingCountry = $state('');
  let contactEmail = $state('');
  let contactPhone = $state('');
  let birthDate = $state('');

  function findCatalogItem(seller: string | undefined, sku: string | undefined): AggregatedCatalogItem | undefined {
    if (!seller || !sku) return undefined;
    const s = seller.toLowerCase();
    const k = sku.toLowerCase();
    return catalog.find(
      (it) =>
        it.seller.toLowerCase() === s &&
        it.product.sku.toLowerCase() === k,
    );
  }

  function formatCurrency(amount: number | null | undefined, code: string | null | undefined): string {
    if (amount == null || !Number.isFinite(amount)) return '?';
    const val = Number(amount);
    const rounded = val.toFixed(2);
    return code ? `${rounded} ${code}` : rounded;
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

    const state = $cartState;
    const basket = state.basket;
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
    const state = $cartState;
    const basket = state.basket;
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

  function close(): void {
    popupControls.close();
  }

  // Keep local form in sync with basket details
  $effect(() => {
    const b = $cartState.basket;

    const addr = b?.shippingAddress;
    shippingStreet = (addr?.streetAddress as string) ?? '';
    shippingLocality = (addr?.addressLocality as string) ?? '';
    shippingPostal = (addr?.postalCode as string) ?? '';
    shippingCountry = (addr?.addressCountry as string) ?? '';

    const contact = b?.contactPoint;
    contactEmail = (contact?.email as string) ?? '';
    contactPhone = (contact?.telephone as string) ?? '';

    const age = b?.ageProof;
    birthDate = (age?.birthDate as string) ?? '';
  });

  async function saveDetails(): Promise<void> {
    localError = null;

    const hasAnyField =
      shippingStreet ||
      shippingLocality ||
      shippingPostal ||
      shippingCountry ||
      contactEmail ||
      contactPhone ||
      birthDate;

    if (!hasAnyField) {
      // nothing to save
      return;
    }

    const patch: any = {};

    patch.shippingAddress = {
      '@type': 'PostalAddress',
      streetAddress: shippingStreet || null,
      addressLocality: shippingLocality || null,
      postalCode: shippingPostal || null,
      addressCountry: shippingCountry || null,
    };

    if (contactEmail || contactPhone) {
      patch.contactPoint = {
        '@type': 'ContactPoint',
        email: contactEmail || null,
        telephone: contactPhone || null,
      };
    }

    if (birthDate) {
      patch.ageProof = {
        '@type': 'Person',
        birthDate,
      };
    }

    try {
      await updateBasketDetails(patch);
    } catch (e: unknown) {
      localError =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
    }
  }

  async function runValidate(): Promise<void> {
    localError = null;
    validating = true;
    try {
      await saveDetails();
      await validateCart();
    } catch (e: unknown) {
      localError =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
    } finally {
      validating = false;
    }
  }

  async function runPreview(): Promise<void> {
    localError = null;
    previewing = true;
    try {
      await saveDetails();
      await previewCartOrder();
    } catch (e: unknown) {
      localError =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
    } finally {
      previewing = false;
    }
  }

  async function runCheckout(): Promise<void> {
    localError = null;
    checkingOut = true;
    try {
      await saveDetails();
      await checkoutCart();
    } catch (e: unknown) {
      localError =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
    } finally {
      checkingOut = false;
    }
  }

  // Derived totals per currency (simple sum of qty * price)
  const perCurrency = $derived.by(() => {
    const state = $cartState;
    const basket = state.basket;
    const out = new Map<string, number>();

    if (!basket?.items) return out;

    for (const line of basket.items) {
      const snap = line.offerSnapshot;
      const price = snap?.price;
      const code = snap?.priceCurrency ?? '???';
      if (price == null || !Number.isFinite(price)) continue;
      const key = code;
      const current = out.get(key) ?? 0;
      out.set(key, current + price * (line.orderQuantity || 0));
    }

    return out;
  });

  // Whether the current basket has been checked out
  const isCheckedOut = $derived.by(() => $cartState.basket?.status === 'CheckedOut');
</script>

<div class="w-full max-w-lg mx-auto space-y-4">
  <header class="flex items-center justify-between">
    <h2 class="text-lg font-semibold">Basket</h2>
    <button type="button" class="btn btn-ghost btn-sm" onclick={close}>
      Close
    </button>
  </header>

  {#if localError}
    <div class="alert alert-error text-xs">
      {localError}
    </div>
  {:else if $cartState.lastError}
    <div class="alert alert-error text-xs">
      {$cartState.lastError}
    </div>
  {/if}

  {#if !$cartState.basket || !$cartState.basket.items || $cartState.basket.items.length === 0}
    <div class="p-4 text-sm opacity-70">
      Your basket is empty.
    </div>
  {:else}
    <div class="space-y-2">
      {#each $cartState.basket.items as line, i}
        <div class="flex items-start justify-between gap-3 border border-base-300 rounded-md px-3 py-2">
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
                  line.offerSnapshot.price ?? null,
                  line.offerSnapshot.priceCurrency ?? null,
                )}
              </div>
            {/if}
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

    <!-- Checkout details (shipping & contact) -->
    <div class="mt-3 border-t border-base-300 pt-3 space-y-2 text-xs">
      <div class="font-semibold text-sm">Shipping &amp; contact</div>

      <div class="grid grid-cols-1 gap-2">
        <label class="form-control">
          <span class="label-text text-xs">Street address</span>
          <input
            class="input input-xs input-bordered"
            bind:value={shippingStreet}
            placeholder="Street and house number"
          />
        </label>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label class="form-control">
            <span class="label-text text-xs">City / locality</span>
            <input
              class="input input-xs input-bordered"
              bind:value={shippingLocality}
            />
          </label>
          <label class="form-control">
            <span class="label-text text-xs">Postal code</span>
            <input
              class="input input-xs input-bordered"
              bind:value={shippingPostal}
            />
          </label>
          <label class="form-control">
            <span class="label-text text-xs">Country</span>
            <input
              class="input input-xs input-bordered"
              bind:value={shippingCountry}
              placeholder="DE, FR, …"
            />
          </label>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        <label class="form-control">
          <span class="label-text text-xs">Email (optional)</span>
          <input
            class="input input-xs input-bordered"
            type="email"
            bind:value={contactEmail}
          />
        </label>
        <label class="form-control">
          <span class="label-text text-xs">Phone (optional)</span>
          <input
            class="input input-xs input-bordered"
            type="tel"
            bind:value={contactPhone}
          />
        </label>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        <label class="form-control">
          <span class="label-text text-xs">Birth date (optional)</span>
          <input
            class="input input-xs input-bordered"
            type="date"
            bind:value={birthDate}
          />
        </label>
      </div>

      <div class="mt-2 flex justify-end">
        <button
          type="button"
          class="btn btn-xs btn-outline"
          onclick={() => saveDetails()}
          disabled={$cartState.loading || isCheckedOut}
        >
          Save details
        </button>
      </div>
    </div>

    <!-- totals -->
    <div class="mt-3 border-t border-base-300 pt-3 text-sm space-y-1">
      {#if perCurrency.size === 0}
        <div class="opacity-70">No priced items.</div>
      {:else}
        {#each Array.from(perCurrency.entries()) as [code, total]}
          <div class="flex justify-between">
            <span>Total ({code})</span>
            <span class="font-semibold">{total.toFixed(2)} {code}</span>
          </div>
        {/each}
      {/if}
    </div>

    <!-- validation summary -->
    {#if $cartState.validation}
      <div class="mt-3 border-t border-base-300 pt-3 text-xs space-y-1">
        <div>
          <strong>Validation:</strong>
          {$cartState.validation.valid ? 'OK' : 'Not valid'}
        </div>

        {#if !$cartState.validation.valid && $cartState.validation.missing.length > 0}
          <div class="mt-1">
            <div class="opacity-70 mb-1">Missing slots:</div>
            <ul class="list-disc list-inside space-y-0.5">
              {#each $cartState.validation.missing as m}
                <li>
                  <code>{m.slot}</code>
                  <span class="opacity-60"> @ {m.path}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/if}

    <!-- order preview -->
    {#if $cartState.orderPreview}
      <div class="mt-3 border-t border-base-300 pt-3 text-xs space-y-1">
        <div><strong>Order preview</strong></div>
        <div>Order #: {$cartState.orderPreview.orderNumber}</div>
        <div>Status: {$cartState.orderPreview.orderStatus}</div>

        {#if $cartState.orderPreview.totalPaymentDue}
          <div>
            Total:&nbsp;
            {#if typeof $cartState.orderPreview.totalPaymentDue.price === 'number'}
              {$cartState.orderPreview.totalPaymentDue.price.toFixed(2)}
            {:else}
              ?
            {/if}
            {#if $cartState.orderPreview.totalPaymentDue.priceCurrency}
              &nbsp;{$cartState.orderPreview.totalPaymentDue.priceCurrency}
            {/if}
          </div>
        {/if}

        {#if $cartState.orderPreview.paymentUrl}
          <div class="mt-2">
            <a
              href={$cartState.orderPreview.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-xs btn-primary"
            >
              Open payment page
            </a>
          </div>
        {/if}
      </div>
    {/if}

    {#if $cartState.basket?.status === 'CheckedOut' && $cartState.lastOrderId}
      <div class="mt-3 alert alert-success text-xs">
        <span>Order created:</span>
        <code class="ml-1 break-all">{$cartState.lastOrderId}</code>
      </div>
    {/if}

    <!-- Validation / preview / checkout actions -->
    <div class="mt-4 flex justify-end gap-2">
      <button
        type="button"
        class="btn btn-sm btn-outline"
        onclick={() => runValidate()}
        disabled={validating || $cartState.loading || isCheckedOut}
      >
        {validating ? 'Validating…' : 'Validate'}
      </button>
      <button
        type="button"
        class="btn btn-sm btn-outline"
        onclick={() => runPreview()}
        disabled={previewing || $cartState.loading || isCheckedOut}
      >
        {previewing ? 'Previewing…' : 'Preview order'}
      </button>
      <button
        type="button"
        class="btn btn-sm btn-primary"
        onclick={() => runCheckout()}
        disabled={
          checkingOut ||
          $cartState.loading ||
          !$cartState.basket ||
          !$cartState.basket.items ||
          $cartState.basket.items.length === 0 ||
          isCheckedOut
        }
      >
        {checkingOut ? 'Checking out…' : 'Checkout'}
      </button>
    </div>
  {/if}
</div>
