import { browser } from '$app/environment';
import { derived, get, writable } from 'svelte/store';
import { getMarketClient } from '$lib/shared/integrations/market';
import type { AggregatedCatalogItem } from '$lib/areas/market/model';
import { pickFirstProductImageUrl } from '$lib/areas/market/services';
import { gnosisConfig } from '$lib/shared/config/circles';

type CheckoutResult = { orderId: string; paymentReference: string; basketId: string };

type BasketLine = {
  seller?: unknown;
  sku?: unknown;
  orderedItem?: {
    sku?: unknown;
    orderedItem?: {
      sku?: unknown;
    };
  };
  orderQuantity?: unknown;
  quantity?: unknown;
  imageUrl?: unknown;
};

type Basket = {
  basketId?: string;
  buyer?: string;
  status?: string;
  items?: BasketLine[];
};

type CartState = {
  loading: boolean;
  lastError: string | null;

  basket: Basket | null;
  validation: unknown | null;
  orderPreview: unknown | null;
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
  const items = Array.isArray($cart.basket?.items) ? ($cart.basket?.items as BasketLine[]) : [];
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
  } catch (e) {
    // Surface storage failures to aid debugging but keep soft-fail behavior
    console.error('[cart] Failed to persist basket id to localStorage:', e);
    try {
      // Only surface to UI in dev builds to avoid noisy errors for users
      const meta = typeof import.meta !== 'undefined' ? (import.meta as { env?: { DEV?: boolean } }) : null;
      if (meta?.env?.DEV) {
        const msg = e instanceof Error ? e.message : String(e ?? 'storage error');
        setError(`Basket storage unavailable: ${msg}`);
      }
    } catch {
      // no-op: avoid cascading errors
    }
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

function lineSeller(line: BasketLine): string | null {
  const s = line?.seller;
  return typeof s === 'string' && s ? normalizeAddr(s) : null;
}

function lineSku(line: BasketLine): string | null {
  const sku =
    line?.orderedItem?.sku ??
    line?.sku ??
    line?.orderedItem?.orderedItem?.sku ??
    null;
  return typeof sku === 'string' && sku ? normalizeSku(sku) : null;
}

function lineQty(line: BasketLine): number {
  const q = line?.orderQuantity ?? line?.quantity ?? 0;
  const n = typeof q === 'number' ? q : Number(q ?? 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function toSdkItemsFromBasket(basket: Basket | null): { seller: string; sku: string; quantity: number; imageUrl?: string }[] {
  const items = Array.isArray(basket?.items) ? basket!.items : [];
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

async function fetchBasketById(basketId: string): Promise<Basket> {
  const client = getMarketClient();
  const token = client.authContext?.getToken?.();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

  return await client.http.request<Basket>({
    method: 'GET',
    url: `${client.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(basketId)}`,
    headers: authHeaders,
  });
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
      writeBasketId(String(basket.basketId));
      return String(basket.basketId);
    }

    // Stored basket is invalid/closed or buyer mismatch; drop it
    writeBasketId(null);
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

export type OrderItemPreview = {
  '@type': 'OrderItem';
  orderQuantity: number;
  orderedItem: { '@type': 'Product'; sku: string };
  seller: string;
  imageUrl?: string;
};

export type BasketPatch = {
  items?: OrderItemPreview[];
  shippingAddress?: unknown;
  billingAddress?: unknown;
  ageProof?: unknown;
  contactPoint?: unknown;
  customer?: unknown;
  ttlSeconds?: number;
};

type BasketPatchItem = {
  seller: string;
  orderedItem: { '@type': 'Product'; sku: string };
  orderQuantity: number;
  imageUrl?: string;
};

export async function patchBasket(basketId: string, patch: BasketPatch): Promise<Basket> {
  const client = getMarketClient();

  const hasItemsPatch = Array.isArray(patch.items);

  const hasTtlPatch = patch.ttlSeconds !== undefined && patch.ttlSeconds !== null;

  const hasDetailsPatch =
    patch.shippingAddress !== undefined ||
    patch.billingAddress !== undefined ||
    patch.contactPoint !== undefined ||
    patch.ageProof !== undefined ||
    patch.customer !== undefined;

  function ensureTyped(obj: unknown, typeName: string): unknown | undefined {
    const isNil = obj === null || obj === undefined;
    if (isNil) return undefined;
    const isObj = typeof obj === 'object' && !Array.isArray(obj);
    if (!isObj) return obj;

    const rec = obj as Record<string, unknown>;
    const type = rec['@type'];
    const hasType = typeof type === 'string' && type.length > 0;
    if (hasType) return obj;

    return {'@type': typeName, ...obj};
  }

  function normalizeImageUrl(u: unknown): string | undefined {
    const s = typeof u === 'string' ? u.trim() : '';
    return s.length > 0 ? s : undefined;
  }

  function buildPatchItems(): BasketPatchItem[] {
    if (!hasItemsPatch) return [];
    return patch.items!
      .map((it) => ({
        seller: normalizeAddr(it.seller),
        orderedItem: { '@type': 'Product' as const, sku: normalizeSku(it.orderedItem?.sku) },
        orderQuantity: Number(it.orderQuantity ?? 0),
        imageUrl: normalizeImageUrl(it.imageUrl),
      }))
      .filter((x) => x.seller && x.orderedItem?.sku && x.orderQuantity > 0);
  }

  function buildDetailsBody(): Record<string, unknown> {
    const body: Record<string, unknown> = {};

    const shipping = ensureTyped(patch.shippingAddress ?? undefined, 'PostalAddress');
    const billing = ensureTyped(patch.billingAddress ?? undefined, 'PostalAddress');
    const contact = ensureTyped(patch.contactPoint ?? undefined, 'ContactPoint');
    const age = ensureTyped(patch.ageProof ?? undefined, 'Person');
    const customer = ensureTyped(patch.customer ?? undefined, 'Person');

    if (shipping !== undefined) body.shippingAddress = shipping;
    if (billing !== undefined) body.billingAddress = billing;
    if (contact !== undefined) body.contactPoint = contact;
    if (age !== undefined) body.ageProof = age;
    if (customer !== undefined) body.customer = customer;

    if (hasTtlPatch) {
      const ttl = Number(patch.ttlSeconds);
      const ttlOk = Number.isFinite(ttl) && ttl > 0;
      if (!ttlOk) {
        throw new Error(`Invalid ttlSeconds: ${patch.ttlSeconds}`);
      }
      body.ttlSeconds = Math.floor(ttl);
    }

    return body;
  }

  const needsDirectPatch =
    (hasItemsPatch && (hasDetailsPatch || hasTtlPatch)) ||
    (hasTtlPatch && !hasItemsPatch);

  if (needsDirectPatch) {
    const token = client.authContext?.getToken?.();
    const body: Record<string, unknown> = {};

    if (hasItemsPatch) {
      body.items = buildPatchItems();
    }

    const details = buildDetailsBody();
    for (const [k, v] of Object.entries(details)) {
      body[k] = v;
    }

    return await client.http.request<Basket>({
      method: 'PATCH',
      url: `${client.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(basketId)}`,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body,
    });
  }

  // Otherwise keep the existing single-operation behavior.
  let updated: Basket | null = null;

  if (hasItemsPatch) {
    const items = patch.items!
      .map((it) => ({
        seller: normalizeAddr(it.seller),
        sku: normalizeSku(it.orderedItem?.sku),
        quantity: Number(it.orderQuantity ?? 0),
        imageUrl: normalizeImageUrl(it.imageUrl),
      }))
      .filter((x) => x.seller && x.sku && x.quantity > 0);

    updated = await client.cart.setItems({ basketId, items });
  }

  if (hasDetailsPatch) {
    updated = await client.cart.setCheckoutDetails({
      basketId,
      shippingAddress: patch.shippingAddress ?? undefined,
      billingAddress: patch.billingAddress ?? undefined,
      contactPoint: patch.contactPoint ?? undefined,
      ageProof: patch.ageProof ?? undefined,
    });
  }

  if (!updated) {
    return await fetchBasketById(basketId);
  }
  return updated;
}

// Indirection for testability: Vitest cannot reliably spy on ESM live bindings, but can spy on
// object properties. Internal helpers should call through this object when they want to allow
// tests to observe/mock the outbound basket patch semantics.
export const cartApi: {
  patchBasket: typeof patchBasket;
  removeLineByIdentity: typeof removeLineByIdentity;
} = {
  patchBasket,
  removeLineByIdentity,
};

async function setItemsForBasket(
  basketId: string,
  items: { seller: string; sku: string; quantity: number; imageUrl?: string }[],
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

  setLoading(true);
  clearError();

  try {
    const basketId = await ensureBasketId(normalizeAddr(buyer));

    // Use in-memory basket if it matches; otherwise fetch once.
    const state = get(cartState);
    const haveBasketInState = String(state.basket?.basketId ?? '') === String(basketId);
    const baseBasket = haveBasketInState && state.basket ? state.basket : await fetchBasketById(basketId);

    if (!haveBasketInState) {
      cartState.update((s) => ({ ...s, basket: baseBasket }));
    }

    const items = toSdkItemsFromBasket(baseBasket);

    const seller = normalizeAddr(String((product as { seller?: unknown })?.seller ?? ''));
    const sku = normalizeSku(product.product?.sku);
    if (!seller || !sku) {
      throw new Error('Product is missing seller or sku');
    }

    const img = pickFirstProductImageUrl(product.product) ?? undefined;

    const idx = items.findIndex((x) => x.seller === seller && x.sku === sku);

    let nextItems: { seller: string; sku: string; quantity: number; imageUrl?: string }[];
    if (idx >= 0) {
      const cur = items[idx];
      nextItems = items.slice();
      nextItems[idx] = {
        ...cur,
        quantity: cur.quantity + 1,
        imageUrl: cur.imageUrl ?? img,
      };
    } else {
      nextItems = items.concat([{ seller, sku, quantity: 1, imageUrl: img }]);
    }

    // setItemsForBasket -> patchBasket -> client.cart.setItems() (PATCH) returns the updated basket.
    await setItemsForBasket(basketId, nextItems);
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
  if (quantity <= 0) {
    // Delegate to remove path to satisfy tests and avoid sending zero-qty lines
    await cartApi.removeLineByIdentity(sellerRaw, skuRaw);
    return;
  }

  setLoading(true);
  clearError();
  try {
    const state = get(cartState);

    const basketId = state.basket?.basketId ?? readBasketId();
    if (!basketId) {
      throw new Error('No basket available');
    }

    const basket = state.basket ?? (await fetchBasketById(basketId));
    const seller = normalizeAddr(sellerRaw);
    const sku = normalizeSku(skuRaw);

    const nextItems = toSdkItemsFromBasket(basket).map((it) => {
      if (it.seller === seller && it.sku === sku) {
        return {...it, quantity};
      }
      return it;
    });

    await setItemsForBasket(basketId, nextItems);
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

    const basketId = state.basket?.basketId ?? readBasketId();
    if (!basketId) {
      throw new Error('No basket available');
    }

    const basket = state.basket ?? (await fetchBasketById(basketId));
    const seller = normalizeAddr(sellerRaw);
    const sku = normalizeSku(skuRaw);

    const nextItems = toSdkItemsFromBasket(basket).filter((it) => !(it.seller === seller && it.sku === sku));
    await setItemsForBasket(basketId, nextItems);
  } catch (e) {
    setError(e);
    throw e;
  } finally {
    setLoading(false);
  }
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

    const updated = await getMarketClient().cart.setCheckoutDetails({
      basketId,
      shippingAddress: shipping,
      billingAddress: billing,
      contactPoint: contact,
      ageProof: age,
      customer: customer,
    });

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

export async function upsertLineByIdentity(
  sellerRaw: string,
  skuRaw: string,
  quantity: number,
  imageUrl?: string,
): Promise<void> {
  const qtyOk = Number.isFinite(quantity) && quantity >= 0;
  if (!qtyOk) throw new Error(`Invalid quantity: ${quantity}`);
  if (quantity <= 0) {
    await cartApi.removeLineByIdentity(sellerRaw, skuRaw);
    return;
  }

  setLoading(true);
  clearError();
  try {
    const state = get(cartState);
    const basketId = state.basket?.basketId ?? readBasketId();
    if (!basketId) throw new Error('No basket available');

    const basket = state.basket ?? (await fetchBasketById(basketId));
    const seller = normalizeAddr(sellerRaw);
    const sku = normalizeSku(skuRaw);

    const items = toSdkItemsFromBasket(basket);
    const idx = items.findIndex((x) => x.seller === seller && x.sku === sku);

    const img = typeof imageUrl === 'string' && imageUrl.trim().length > 0 ? imageUrl.trim() : undefined;

    const nextItems =
      idx >= 0
        ? items.map((it, i) =>
          i === idx
            ? {...it, quantity, imageUrl: it.imageUrl ?? img}
            : it
        )
        : items.concat([{seller, sku, quantity, imageUrl: img}]);

    await setItemsForBasket(basketId, nextItems);
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
  await upsertLineByIdentity(seller, sku, quantity, img);
}

export function clearCart(): void {
  writeBasketId(null);
  cartState.set({ ...initialState });
}
