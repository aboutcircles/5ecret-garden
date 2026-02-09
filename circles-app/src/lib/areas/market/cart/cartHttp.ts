import { getMarketClient } from '$lib/shared/integrations/market';
import type { Basket, BasketPatch, OrderItemPreview } from './types';
import { normalizeAddr, normalizeSku, normalizeImageUrl } from './basketUtils';

type BasketPatchItem = {
  seller: string;
  orderedItem: { '@type': 'Product'; sku: string };
  orderQuantity: number;
  imageUrl?: string;
};

export async function fetchBasketById(basketId: string): Promise<Basket> {
  const client = getMarketClient();
  const token = client.authContext?.getToken?.();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

  return await client.http.request<Basket>({
    method: 'GET',
    url: `${client.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(basketId)}`,
    headers: authHeaders,
  });
}

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

    return { '@type': typeName, ...obj };
  }

  function buildPatchItems(items: OrderItemPreview[]): BasketPatchItem[] {
    return items
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
    (hasItemsPatch && (hasDetailsPatch || hasTtlPatch)) || (hasTtlPatch && !hasItemsPatch);

  if (needsDirectPatch) {
    const token = client.authContext?.getToken?.();
    const body: Record<string, unknown> = {};

    if (hasItemsPatch) {
      body.items = buildPatchItems(patch.items!);
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
    const items = patch
      .items!.map((it) => ({
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
