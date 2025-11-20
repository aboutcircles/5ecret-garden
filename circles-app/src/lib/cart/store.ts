// src/lib/cart/store.ts
import { writable, derived, type Writable } from 'svelte/store';
import type { Address } from '@circles-sdk/utils';
import { MARKET_OPERATOR } from '$lib/config/market';
import { normalizeAddress } from '$lib/offers/adapters';
import type { Basket, ValidationResult } from './types';
import {
  createBasket,
  getBasket,
  patchBasket,
  type CartClientConfig,
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
};

const initialState: CartState = {
  basketId: null,
  basket: null,
  validation: null,
  loading: false,
  lastError: undefined,
  operator: undefined,
  buyer: undefined,
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
