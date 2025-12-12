import { browser } from '$app/environment';
import { writable, derived, get } from 'svelte/store';
import { getMarketClient } from '$lib/sdk/marketClient';
import { MARKET_OPERATOR, GNOSIS_CHAIN_ID_NUM } from '$lib/config/market';
import type { AggregatedCatalogItem } from '$lib/market/types';
import { pickFirstProductImageUrl } from '$lib/market/imageHelpers';

type CheckoutResult = { orderId: string; paymentReference: string; basketId: string };

type CartState = {
  loading: boolean;
  lastError: string | null;

  basket: any | null;
  validation: any | null;
  orderPreview: any | null;
  lastCheckout: CheckoutResult | null;
};

const KEY_BASKET_ID = 'circles_market_basket_id';

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
  const items = Array.isArray(($cart as any)?.basket?.items) ? ($cart as any).basket.items : [];
  let total = 0;
  for (const it of items) {
    total += lineQty(it);
  }
  return total;
});

function readBasketId(): string | null {
  if (!browser) return null;
  try {
    const v = window.localStorage.getItem(KEY_BASKET_ID);
    return v && v.trim().length > 0 ? v.trim() : null;
  } catch {
    return null;
  }
}

function writeBasketId(id: string | null): void {
  if (!browser) return;
  try {
    if (!id) {
      window.localStorage.removeItem(KEY_BASKET_ID);
    } else {
      window.localStorage.setItem(KEY_BASKET_ID, id);
    }
  } catch {
    // ignore storage failures
  }
}

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

function normalizeAddr(a: string): string {
  return String(a ?? '').toLowerCase();
}

function normalizeSku(s: string): string {
  return String(s ?? '').toLowerCase();
}

function lineSeller(line: any): string | null {
  const s = line?.seller;
  return typeof s === 'string' && s ? normalizeAddr(s) : null;
}

function lineSku(line: any): string | null {
  const sku =
    line?.orderedItem?.sku ??
    line?.sku ??
    line?.orderedItem?.orderedItem?.sku ??
    null;
  return typeof sku === 'string' && sku ? normalizeSku(sku) : null;
}

function lineQty(line: any): number {
  const q = line?.orderQuantity ?? line?.quantity ?? 0;
  const n = typeof q === 'number' ? q : Number(q ?? 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function toSdkItemsFromBasket(basket: any): { seller: string; sku: string; quantity: number; imageUrl?: string }[] {
  const items = Array.isArray(basket?.items) ? basket.items : [];
  const out: { seller: string; sku: string; quantity: number; imageUrl?: string }[] = [];
  for (const it of items) {
    const seller = lineSeller(it);
    const sku = lineSku(it);
    const quantity = lineQty(it);
    if (!seller || !sku) continue;
    out.push({ seller, sku, quantity, imageUrl: typeof it?.imageUrl === 'string' ? it.imageUrl : undefined });
  }
  return out;
}

async function fetchBasketById(basketId: string): Promise<any> {
  const client = getMarketClient();
  return await client.http.request<any>({
    method: 'GET',
    url: `${client.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(basketId)}`,
    headers: {},
  });
}

async function ensureBasketId(buyer: string): Promise<string> {
  const state = get(cartState);

  const existing = state.basket?.basketId ?? readBasketId();
  const existingStatus = String(state.basket?.status ?? '');
  const isClosed = existingStatus.toLowerCase() === 'checkedout';

  if (existing && !isClosed) {
    return String(existing);
  }

  const client = getMarketClient();
  const created = await client.cart.createBasket({
    buyer,
    operator: MARKET_OPERATOR,
    chainId: GNOSIS_CHAIN_ID_NUM,
  });

  writeBasketId(created.basketId);
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
    writeBasketId(null);
    cartState.update((s) => ({ ...s, basket: null }));
    setError(e);
  } finally {
    setLoading(false);
  }
}

if (browser) {
  void reloadBasketIfPresent();
}

async function setItems(items: { seller: string; sku: string; quantity: number; imageUrl?: string }[]): Promise<void> {
  const state = get(cartState);

  const basketId = state.basket?.basketId ?? readBasketId();
  if (!basketId) {
    throw new Error('No basketId available');
  }

  const client = getMarketClient();
  const updated = await client.cart.setItems({ basketId, items });
  cartState.update((s) => ({ ...s, basket: updated }));
}

export async function addToCart(product: AggregatedCatalogItem, buyer: string | null | undefined): Promise<void> {
  if (!buyer) {
    throw new Error('Buyer address is required to add to basket');
  }
  setLoading(true);
  clearError();
  try {
    const basketId = await ensureBasketId(normalizeAddr(buyer));

    const curBasket = await fetchBasketById(basketId);
    cartState.update((s) => ({ ...s, basket: curBasket }));

    const items = toSdkItemsFromBasket(curBasket);

    const seller = normalizeAddr(product.seller as any);
    const sku = normalizeSku(product.product?.sku);
    if (!seller || !sku) {
      throw new Error('Product is missing seller or sku');
    }

    const idx = items.findIndex((x) => x.seller === seller && x.sku === sku);
    const img = pickFirstProductImageUrl(product.product);
    if (idx >= 0) {
      const next = items.slice();
      next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
      await getMarketClient().cart.setItems({ basketId, items: next });
    } else {
      const next = items.concat([{ seller, sku, quantity: 1, imageUrl: img ?? undefined }]);
      await getMarketClient().cart.setItems({ basketId, items: next });
    }

    const refreshed = await fetchBasketById(basketId);
    cartState.update((s) => ({ ...s, basket: refreshed }));
  } catch (e) {
    setError(e);
    throw e;
  } finally {
    setLoading(false);
  }
}

export async function setLineQuantityByIdentity(
  sellerRaw: string,
  skuRaw: string,
  quantity: number,
): Promise<void> {
  const qtyOk = Number.isFinite(quantity) && quantity >= 0;
  if (!qtyOk) {
    throw new Error(`Invalid quantity: ${quantity}`);
  }

  setLoading(true);
  clearError();
  try {
    const state = get(cartState);

    const basket = state.basket ?? (readBasketId() ? await fetchBasketById(readBasketId()!) : null);
    if (!basket?.basketId) {
      throw new Error('No basket available');
    }

    const seller = normalizeAddr(sellerRaw);
    const sku = normalizeSku(skuRaw);

    const items = toSdkItemsFromBasket(basket).map((it) => {
      if (it.seller === seller && it.sku === sku) {
        return { ...it, quantity };
      }
      return it;
    });

    await setItems(items);
    const refreshed = await fetchBasketById(basket.basketId);
    cartState.update((s) => ({ ...s, basket: refreshed }));
  } catch (e) {
    setError(e);
    throw e;
  } finally {
    setLoading(false);
  }
}

export async function removeLineByIdentity(sellerRaw: string, skuRaw: string): Promise<void> {
  setLoading(true);
  clearError();
  try {
    const state = get(cartState);

    const basket = state.basket ?? (readBasketId() ? await fetchBasketById(readBasketId()!) : null);
    if (!basket?.basketId) {
      throw new Error('No basket available');
    }

    const seller = normalizeAddr(sellerRaw);
    const sku = normalizeSku(skuRaw);

    const items = toSdkItemsFromBasket(basket).filter((it) => !(it.seller === seller && it.sku === sku));
    await setItems(items);

    const refreshed = await fetchBasketById(basket.basketId);
    cartState.update((s) => ({ ...s, basket: refreshed }));
  } catch (e) {
    setError(e);
    throw e;
  } finally {
    setLoading(false);
  }
}

function stripNulls<T extends Record<string, any>>(obj: T | null | undefined): Partial<T> | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export async function updateBasketDetails(patch: any): Promise<void> {
  setLoading(true);
  clearError();
  try {
    const state = get(cartState);

    const basketId = state.basket?.basketId ?? readBasketId();
    if (!basketId) {
      throw new Error('No basketId available');
    }

    const shipping = stripNulls(patch?.shippingAddress);
    const billing = stripNulls(patch?.billingAddress);
    const contact = stripNulls(patch?.contactPoint);
    const age = stripNulls(patch?.ageProof);

    const updated = await getMarketClient().cart.setCheckoutDetails({
      basketId,
      shippingAddress: shipping as any,
      billingAddress: billing as any,
      contactPoint: contact as any,
      ageProof: age as any,
    });

    cartState.update((s) => ({ ...s, basket: updated }));
  } catch (e) {
    setError(e);
    throw e;
  } finally {
    setLoading(false);
  }
}

export async function validateCart(): Promise<any> {
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

export async function previewCartOrder(): Promise<any> {
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

export function clearCart(): void {
  writeBasketId(null);
  cartState.set({ ...initialState });
}
