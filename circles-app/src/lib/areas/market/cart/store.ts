import { derived, get, writable } from 'svelte/store';
import type { AggregatedCatalogItem } from '$lib/areas/market/model';
import { pickFirstProductImageUrl } from '$lib/areas/market/services';
import { gnosisConfig } from '$lib/shared/config/circles';
import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
import type { Basket, CartState, CheckoutResult, SdkCartItem } from './types';
import type { BasketPatch, OrderItemPreview } from './types';
import { toLocalBasket } from './types';
import { readBasketId, writeBasketId } from './basketIdStorage';
import { normalizeAddr, normalizeSku, toSdkItemsFromBasket, lineQty, normalizeImageUrl } from './basketUtils';
import { fetchBasketById, patchBasket } from './cartHttp';

export type { BasketPatch, OrderItemPreview };
export type { Basket };
export { patchBasket };

const initialState: CartState = {
  loading: false,
  lastError: null,
  basket: null,
  validation: null,
  orderPreview: null,
  lastCheckout: null,
};

export const cartState = writable<CartState>(initialState);

// Derived store: total quantity across all basket lines
export const cartItemCount = derived(cartState, ($cart) => {
  const items = Array.isArray($cart.basket?.items) ? $cart.basket!.items! : [];
  let total = 0;
  for (const it of items) {
    total += lineQty(it);
  }
  return total;
});

function setLoading(loading: boolean): void {
  cartState.update((s) => ({ ...s, loading }));
}

function setError(err: unknown): void {
  const msg =
    err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
  cartState.update((s) => ({ ...s, lastError: msg }));
}

function clearError(): void {
  cartState.update((s) => ({ ...s, lastError: null }));
}

function writeBasketIdWithDevUiSurface(id: string | null): void {
  writeBasketId(id, { onDevError: (msg) => setError(msg) });
}

async function ensureBasketId(buyer: string): Promise<string> {
  const state = get(cartState);
  const storedId = readBasketId();
  const candidateId = (state.basket?.basketId ?? storedId)
    ? String(state.basket?.basketId ?? storedId)
    : null;

  if (candidateId) {
    const haveFreshBasket = String(state.basket?.basketId ?? '') === candidateId;
    const basket = haveFreshBasket ? state.basket : await fetchBasketById(candidateId).catch(() => null);

    const status = String(basket?.status ?? '').toLowerCase();
    const isClosed = status === 'checkedout';

    const basketBuyer = typeof basket?.buyer === 'string' ? normalizeAddr(basket.buyer) : null;
    const buyerMismatch = basketBuyer !== null && basketBuyer !== normalizeAddr(buyer);

    if (basket && !isClosed && !buyerMismatch) {
      cartState.update((s) => ({ ...s, basket }));
      writeBasketIdWithDevUiSurface(String(basket.basketId));
      return String(basket.basketId);
    }

    // Stored basket is invalid/closed or buyer mismatch; drop it
    writeBasketIdWithDevUiSurface(null);
    cartState.update((s) => ({ ...s, basket: null }));
  }

  if (!gnosisConfig.production.marketOperator) {
    throw new Error(`gnosisConfig.production.marketOperator is not set.`)
  }

  const client = getMarketClient();
  const created = await client.cart.createBasket({
    buyer,
    operator: gnosisConfig.production.marketOperator,
    chainId: gnosisConfig.production.marketChainId,
  });

  writeBasketIdWithDevUiSurface(created.basketId);
  return created.basketId;
}

async function reloadBasketIfPresent(): Promise<void> {
  const id = readBasketId();
  if (!id) return;

  setLoading(true);
  clearError();
  try {
    const b = await fetchBasketById(id);
    cartState.update((s) => ({ ...s, basket: b }));
  } catch (e) {
    // If the basket is gone/invalid, drop it locally
    writeBasketIdWithDevUiSurface(null);
    cartState.update((s) => ({ ...s, basket: null }));
    setError(e);
  } finally {
    setLoading(false);
  }
}

if (typeof window !== 'undefined') {
  void reloadBasketIfPresent();
}

// Indirection for testability: Vitest cannot reliably spy on ESM live bindings, but can spy on
// object properties. Internal helpers should call through this object when they want to allow
// tests to observe/mock the outbound basket patch semantics.
export const cartApi: {
  patchBasket: typeof patchBasket;
  updateLineByIdentity: typeof updateLineByIdentity;
} = {
  patchBasket,
  updateLineByIdentity,
};

async function withBasketItems(
  fn: (items: SdkCartItem[], basketId: string) => Promise<SdkCartItem[]> | SdkCartItem[],
): Promise<void> {
  setLoading(true);
  clearError();
  try {
    const state = get(cartState);
    const basketId = state.basket?.basketId ?? readBasketId();
    if (!basketId) {
      throw new Error('No basket available');
    }

    const basket = state.basket ?? (await fetchBasketById(basketId));
    const currentItems = toSdkItemsFromBasket(basket);
    const nextItems = await fn(currentItems, basketId);

    await setItemsForBasket(basketId, nextItems);
  } catch (e) {
    setError(e);
    throw e;
  } finally {
    setLoading(false);
  }
}

async function setItemsForBasket(
  basketId: string,
  items: SdkCartItem[],
): Promise<Basket> {
  // Convert to OrderItemPreview shape so tests can spy on payload semantics
  const orderItems: OrderItemPreview[] = items.map((it) => ({
    '@type': 'OrderItem',
    orderQuantity: it.quantity,
    seller: it.seller,
    imageUrl: it.imageUrl,
    orderedItem: {'@type': 'Product', sku: it.sku},
  }));

  const updated = await cartApi.patchBasket(basketId, {items: orderItems});
  cartState.update((s) => ({ ...s, basket: updated }));
  return updated;
}

export async function setItems(items: {
  seller: string;
  sku: string;
  quantity: number;
  imageUrl?: string
}[]): Promise<void> {
  const state = get(cartState);

  const basketId = state.basket?.basketId ?? readBasketId();
  if (!basketId) {
    throw new Error('No basketId available');
  }

  await setItemsForBasket(basketId, items);
}

export async function addToCart(product: AggregatedCatalogItem, buyer: string | null | undefined): Promise<void> {
  if (!buyer) {
    throw new Error('Buyer address is required to add to basket');
  }

  await ensureBasketId(normalizeAddr(buyer));

  const seller = normalizeAddr(String((product as { seller?: unknown })?.seller ?? ''));
  const sku = normalizeSku(product.product?.sku);
  if (!seller || !sku) {
    throw new Error('Product is missing seller or sku');
  }

  await withBasketItems(async (items) => {
    const img = pickFirstProductImageUrl(product.product) ?? undefined;
    const idx = items.findIndex((x) => x.seller === seller && x.sku === sku);

    if (idx >= 0) {
      const cur = items[idx];
      const nextItems = items.slice();
      nextItems[idx] = {
        ...cur,
        quantity: cur.quantity + 1,
        imageUrl: cur.imageUrl ?? img,
      };
      return nextItems;
    }
    return items.concat([{ seller, sku, quantity: 1, imageUrl: img }]);
  });
}

export async function updateLineByIdentity(
  sellerRaw: string,
  skuRaw: string,
  quantity: number,
  imageUrl?: string,
): Promise<void> {
  const qtyOk = Number.isFinite(quantity) && quantity >= 0;
  if (!qtyOk) {
    throw new Error(`Invalid quantity: ${quantity}`);
  }

  const seller = normalizeAddr(sellerRaw);
  const sku = normalizeSku(skuRaw);

  await withBasketItems((items) => {
    if (quantity <= 0) {
      return items.filter((it) => !(it.seller === seller && it.sku === sku));
    }

    const idx = items.findIndex((it) => it.seller === seller && it.sku === sku);
    const img = normalizeImageUrl(imageUrl);

    if (idx >= 0) {
      return items.map((it, i) =>
        i === idx ? { ...it, quantity, imageUrl: it.imageUrl ?? img } : it,
      );
    } else {
      return items.concat([{ seller, sku, quantity, imageUrl: img }]);
    }
  });
}

/** @deprecated use updateLineByIdentity */
export async function setLineQuantityByIdentity(
  sellerRaw: string,
  skuRaw: string,
  quantity: number,
): Promise<void> {
  await updateLineByIdentity(sellerRaw, skuRaw, quantity);
}

/** @deprecated use updateLineByIdentity */
export async function removeLineByIdentity(sellerRaw: string, skuRaw: string): Promise<void> {
  await updateLineByIdentity(sellerRaw, skuRaw, 0);
}

export async function upsertLineByIdentity(
  sellerRaw: string,
  skuRaw: string,
  quantity: number,
  imageUrl?: string,
): Promise<void> {
  await updateLineByIdentity(sellerRaw, skuRaw, quantity, imageUrl);
}

function stripNulls(obj: unknown): Record<string, unknown> | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export async function updateBasketDetails(patch: unknown): Promise<void> {
  setLoading(true);
  clearError();
  try {
    const state = get(cartState);

    const basketId = state.basket?.basketId ?? readBasketId();
    if (!basketId) {
      throw new Error('No basketId available');
    }

    const patchObj = patch && typeof patch === 'object' ? (patch as Record<string, unknown>) : {};

    const shipping = stripNulls(patchObj.shippingAddress);
    const billing = stripNulls(patchObj.billingAddress);
    const contact = stripNulls(patchObj.contactPoint);
    const age = stripNulls(patchObj.ageProof);
    const customer = stripNulls(patchObj.customer);

    const updated = toLocalBasket(await getMarketClient().cart.setCheckoutDetails({
      basketId,
      shippingAddress: shipping,
      billingAddress: billing,
      contactPoint: contact,
      ageProof: age,
      customer: customer,
    }));

    cartState.update((s) => ({ ...s, basket: updated }));
  } catch (e) {
    setError(e);
    throw e;
  } finally {
    setLoading(false);
  }
}

export async function validateCart(): Promise<unknown> {
  setLoading(true);
  clearError();
  try {
    const state = get(cartState);

    const basketId = state.basket?.basketId ?? readBasketId();
    if (!basketId) {
      throw new Error('No basketId available');
    }

    const v = await getMarketClient().cart.validateBasket(basketId);
    cartState.update((s) => ({ ...s, validation: v }));
    return v;
  } catch (e) {
    setError(e);
    throw e;
  } finally {
    setLoading(false);
  }
}

export async function previewCartOrder(): Promise<unknown> {
  setLoading(true);
  clearError();
  try {
    const state = get(cartState);

    const basketId = state.basket?.basketId ?? readBasketId();
    if (!basketId) {
      throw new Error('No basketId available');
    }

    const p = await getMarketClient().cart.previewOrder(basketId);
    cartState.update((s) => ({ ...s, orderPreview: p }));
    return p;
  } catch (e) {
    setError(e);
    throw e;
  } finally {
    setLoading(false);
  }
}

export async function checkoutCart(): Promise<CheckoutResult> {
  setLoading(true);
  clearError();
  try {
    const state = get(cartState);

    const basketId = state.basket?.basketId ?? readBasketId();
    if (!basketId) {
      throw new Error('No basketId available');
    }

    const res = await getMarketClient().cart.checkoutBasket({ basketId });
    cartState.update((s) => ({
      ...s,
      lastCheckout: res,
      basket: s.basket ? { ...s.basket, status: 'CheckedOut' } : s.basket,
    }));
    return res;
  } catch (e) {
    setError(e);
    throw e;
  } finally {
    setLoading(false);
  }
}

export async function upsertLineItem(item: AggregatedCatalogItem, quantity: number): Promise<void> {
  const seller = normalizeAddr(String((item as { seller?: unknown })?.seller ?? ''));
  const sku = normalizeSku(item.product?.sku);
  if (!seller || !sku) throw new Error('Product missing seller or sku');
  const img = pickFirstProductImageUrl(item.product) ?? undefined;
  await updateLineByIdentity(seller, sku, quantity, img);
}

export function clearCart(): void {
  writeBasketIdWithDevUiSurface(null);
  cartState.set({ ...initialState });
}

