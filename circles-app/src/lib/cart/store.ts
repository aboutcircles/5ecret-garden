// src/lib/cart/store.ts
import { writable, derived, type Writable } from 'svelte/store';
import type { Address } from '@circles-sdk/utils';
import { MARKET_OPERATOR } from '$lib/config/market';
import { normalizeAddress } from '$lib/offers/adapters';
import type { Basket, ValidationResult, OrderSnapshot } from './types';
import {
  createBasket,
  getBasket,
  patchBasket,
  validateBasket,
  previewOrder,
  checkoutBasket,
  CartHttpError,
  type CartClientConfig,
  type CheckoutResponse,
} from './client';
import { catalogItemToOrderItem } from './mapping';
import type { AggregatedCatalogItem } from '$lib/market/types';

export type CartState = {
  basketId: string | null;
  basket: Basket | null;
  validation: ValidationResult | null;
  loading: boolean;
  lastError?: string;
  operator?: Address;
  buyer?: Address;
  orderPreview?: OrderSnapshot | null;
  lastOrderId?: string | null;
};

const initialState: CartState = {
  basketId: null,
  basket: null,
  validation: null,
  loading: false,
  lastError: undefined,
  operator: undefined,
  buyer: undefined,
  orderPreview: null,
  lastOrderId: null,
};

export const cartState: Writable<CartState> = writable(initialState);

/**
 * Ensure we have a basket for a given (operator, buyer).
 * If an existing basket in state belongs to the same operator/buyer and is not
 * marked CheckedOut/Expired, reuse it; otherwise create a new one.
 */
export async function initCart(
  operator: Address,
  buyer: Address,
  cfg?: CartClientConfig,
): Promise<void> {
  cartState.update((s) => ({ ...s, loading: true, lastError: undefined }));

  try {
    let next: CartState = initialState;

    cartState.update((s) => {
      next = s;
      return s;
    });

    const sameOwner =
      next.operator?.toLowerCase() === operator.toLowerCase() &&
      next.buyer?.toLowerCase() === buyer.toLowerCase();

    const reusable =
      sameOwner &&
      next.basket !== null &&
      next.basket.status !== 'CheckedOut' &&
      next.basket.status !== 'Expired';

    let basketId = next.basketId ?? null;

    if (!reusable || !basketId) {
      const created = await createBasket({ operator, buyer }, cfg);
      basketId = created.basketId;
    }

    const basket = await getBasket(basketId!, cfg);

    cartState.set({
      basketId,
      basket,
      validation: null,
      loading: false,
      lastError: undefined,
      operator,
      buyer,
      orderPreview: null,
      lastOrderId: null,
    });
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
    cartState.set({ ...initialState, lastError: String(msg), loading: false });
    // Propagate the failure to callers (addToCart, etc.)
    throw e;
  }
}

/**
 * Replace or append a line item for a given catalog item with a given quantity.
 * (No validation or checkout here; this is just state + PATCH.)
 */
export async function upsertLineItem(
  item: AggregatedCatalogItem,
  quantity: number,
  cfg?: CartClientConfig,
): Promise<void> {
  let snapshot: CartState = initialState;
  cartState.update((s) => {
    snapshot = s;
    return { ...s, loading: true, lastError: undefined };
  });

  if (!snapshot.basketId || !snapshot.basket) {
    throw new Error(
      'Cart not initialized – call initCart(operator, buyer, cfg) before upserting items.',
    );
  }

  try {
    const line = catalogItemToOrderItem(item, quantity);

    const existing = snapshot.basket.items ?? [];
    const sku = line.orderedItem.sku.toLowerCase();
    const seller = (line.seller ?? '').toLowerCase();

    const nextItems = [...existing];
    const idx = existing.findIndex(
      (it) =>
        it.orderedItem.sku.toLowerCase() === sku &&
        (it.seller ?? '').toLowerCase() === seller,
    );

    if (idx >= 0) {
      nextItems[idx] = { ...line };
    } else {
      nextItems.push(line);
    }

    const patched = await patchBasket(snapshot.basketId, { items: nextItems }, cfg);

    cartState.update((s) => ({
      ...s,
      basket: patched,
      loading: false,
      lastError: undefined,
      validation: null,
      orderPreview: null,
      lastOrderId: null,
    }));
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
    cartState.update((s) => ({
      ...s,
      loading: false,
      lastError: String(msg),
    }));
  }
}

/**
 * Remove a line item from the basket by sku + seller derived from the catalog item.
 */
export async function removeLineItem(
  item: AggregatedCatalogItem,
  cfg?: CartClientConfig,
): Promise<void> {
  let snapshot: CartState = initialState;
  cartState.update((s) => {
    snapshot = s;
    return { ...s, loading: true, lastError: undefined };
  });

  if (!snapshot.basketId || !snapshot.basket) {
    throw new Error(
      'Cart not initialized – call initCart(operator, buyer, cfg) before removing items.',
    );
  }

  try {
    const sku = item.product.sku.toLowerCase();
    const seller = item.seller.toLowerCase();

    const existing = snapshot.basket.items ?? [];
    const nextItems = existing.filter(
      (it) =>
        it.orderedItem.sku.toLowerCase() !== sku ||
        (it.seller ?? '').toLowerCase() !== seller,
    );

    const patched = await patchBasket(snapshot.basketId, { items: nextItems }, cfg);

    cartState.update((s) => ({
      ...s,
      basket: patched,
      loading: false,
      lastError: undefined,
      validation: null,
      orderPreview: null,
      lastOrderId: null,
    }));
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
    cartState.update((s) => ({
      ...s,
      loading: false,
      lastError: String(msg),
    }));
  }
}

/**
 * Set quantity of a line item; quantity <= 0 means remove.
 */
export async function setLineQuantity(
  item: AggregatedCatalogItem,
  quantity: number,
  cfg?: CartClientConfig,
): Promise<void> {
  if (!(quantity > 0)) {
    // quantity <= 0 → treat as removal
    await removeLineItem(item, cfg);
    return;
  }

  await upsertLineItem(item, quantity, cfg);
}

/**
 * Validate the current basket via POST /baskets/{id}/validate.
 * Stores the ValidationResult in cartState.validation.
 */
export async function validateCart(cfg?: CartClientConfig): Promise<ValidationResult> {
  let snapshot: CartState = initialState;
  cartState.update((s) => {
    snapshot = s;
    return { ...s, loading: true, lastError: undefined };
  });

  const hasBasketId = typeof snapshot.basketId === 'string' && snapshot.basketId.length > 0;
  if (!hasBasketId) {
    const err = new Error('Cart not initialized – cannot validate basket.');
    cartState.update((s) => ({
      ...initialState,
      lastError: err.message,
      loading: false,
    }));
    throw err;
  }

  try {
    const result = await validateBasket(snapshot.basketId!, cfg);
    cartState.update((s) => ({
      ...s,
      loading: false,
      lastError: undefined,
      validation: result,
    }));
    return result;
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
    cartState.update((s) => ({
      ...s,
      loading: false,
      lastError: String(msg),
    }));
    throw e;
  }
}

/**
 * Preview the current basket as an OrderSnapshot via POST /baskets/{id}/preview.
 * Stores the snapshot in cartState.orderPreview.
 */
export async function previewCartOrder(
  cfg?: CartClientConfig,
): Promise<OrderSnapshot> {
  let snapshot: CartState = initialState;
  cartState.update((s) => {
    snapshot = s;
    return { ...s, loading: true, lastError: undefined };
  });

  const hasBasketId = typeof snapshot.basketId === 'string' && snapshot.basketId.length > 0;
  if (!hasBasketId) {
    const err = new Error('Cart not initialized – cannot preview order.');
    cartState.update((s) => ({
      ...initialState,
      lastError: err.message,
      loading: false,
    }));
    throw err;
  }

  try {
    const snapshotOrder = await previewOrder(snapshot.basketId!, cfg);
    cartState.update((s) => ({
      ...s,
      loading: false,
      lastError: undefined,
      orderPreview: snapshotOrder,
    }));
    return snapshotOrder;
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
    cartState.update((s) => ({
      ...s,
      loading: false,
      lastError: String(msg),
    }));
    throw e;
  }
}

/**
 * Checkout the current basket via POST /baskets/{id}/checkout.
 * Stores the last orderId in cartState.lastOrderId and marks the basket as CheckedOut.
 */
export async function checkoutCart(
  cfg?: CartClientConfig,
): Promise<CheckoutResponse> {
  let snapshot: CartState = initialState;
  cartState.update((s) => {
    snapshot = s;
    return { ...s, loading: true, lastError: undefined };
  });

  const hasBasketId =
    typeof snapshot.basketId === 'string' && snapshot.basketId.length > 0;
  if (!hasBasketId) {
    const err = new Error('Cart not initialized – cannot checkout basket.');
    cartState.update((s) => ({
      ...initialState,
      lastError: err.message,
      loading: false,
    }));
    throw err;
  }

  try {
    const resp = await checkoutBasket(snapshot.basketId!, cfg);

    cartState.update((s) => ({
      ...s,
      loading: false,
      lastError: undefined,
      validation: null,
      orderPreview: null,
      lastOrderId: (resp as any)?.orderId ?? (resp as any)?.basketId ?? null,
      basket: s.basket
        ? {
            ...s.basket,
            status: 'CheckedOut',
          }
        : s.basket,
    }));

    return resp;
  } catch (e: unknown) {
    let msg: string;
    let validation: ValidationResult | null = null;

    if (e instanceof CartHttpError) {
      const body = e.body as any;
      msg = typeof body?.error === 'string' ? body.error : e.message;
      if (body && typeof body === 'object' && body.validation) {
        validation = body.validation as ValidationResult;
      }
    } else {
      msg =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
    }

    cartState.update((s) => ({
      ...s,
      loading: false,
      lastError: String(msg),
      validation: validation ?? s.validation,
    }));
    throw e;
  }
}

/**
 * Update basket-level details such as shipping/billing address, ageProof, contactPoint, ttlSeconds.
 * Does a PATCH /baskets/{id} and updates cartState.basket.
 */
export async function updateBasketDetails(
  patch: {
    shippingAddress?: Basket['shippingAddress'];
    billingAddress?: Basket['billingAddress'];
    ageProof?: Basket['ageProof'];
    contactPoint?: Basket['contactPoint'];
    ttlSeconds?: number;
  },
  cfg?: CartClientConfig,
): Promise<void> {
  let snapshot: CartState = initialState;
  cartState.update((s) => {
    snapshot = s;
    return { ...s, loading: true, lastError: undefined };
  });

  if (!snapshot.basketId || !snapshot.basket) {
    const err = new Error('Cart not initialized – cannot update basket details.');
    cartState.update((s) => ({
      ...initialState,
      lastError: err.message,
      loading: false,
    }));
    throw err;
  }

  try {
    const patched = await patchBasket(snapshot.basketId, patch, cfg);

    cartState.update((s) => ({
      ...s,
      basket: patched,
      loading: false,
      lastError: undefined,
      validation: null,
      orderPreview: null,
    }));
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error';
    cartState.update((s) => ({
      ...s,
      loading: false,
      lastError: String(msg),
    }));
    throw e;
  }
}

// Number of items in the current basket (0 if none)
export const cartItemCount = derived(cartState, ($cart) => {
  if (!$cart.basket || !$cart.basket.items) return 0;
  return $cart.basket.items.reduce((acc, it) => acc + (it.orderQuantity || 0), 0);
});

/**
 * Convenience helper to add a single quantity of a catalog item to the cart.
 * It normalizes the buyer/operator addresses, ensures a basket exists
 * and then upserts the line item with quantity = 1.
 */
export async function addToCart(
  item: AggregatedCatalogItem,
  buyerRaw: string | Address | null | undefined,
  cfg?: CartClientConfig,
): Promise<void> {
  if (!buyerRaw) {
    throw new Error('No buyer address available – connect a Circles avatar first.');
  }

  let buyer: Address;
  let operator: Address;
  try {
    buyer = normalizeAddress(String(buyerRaw));
    operator = normalizeAddress(MARKET_OPERATOR);
  } catch (_e) {
    throw new Error('Invalid buyer or operator address.');
  }

  await initCart(operator, buyer, { ...cfg, apiBase: cfg?.apiBase });
  await upsertLineItem(item, 1, { ...cfg, apiBase: cfg?.apiBase });
}
