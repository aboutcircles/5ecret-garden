import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cartState, upsertLineItem } from '$lib/cart/store';
import * as client from '$lib/cart/client';
import type { Basket } from '$lib/cart/types';
import type { AggregatedCatalogItem } from '$lib/market/types';

function baseBasket(overrides: Partial<Basket> = {}): Basket {
  return {
    '@context': ['https://schema.org/', 'https://aboutcircles.com/contexts/circles-market/'],
    '@type': 'circles:Basket',
    basketId: 'b1',
    buyer: '0xbuyer' as any,
    operator: '0xoperator' as any,
    chainId: 100,
    status: 'Draft',
    items: [],
    createdAt: Math.floor(Date.now() / 1000),
    modifiedAt: Math.floor(Date.now() / 1000),
    ttlSeconds: 600,
    shippingAddress: null as any,
    billingAddress: null as any,
    ageProof: null as any,
    contactPoint: null as any,
    ...overrides,
  } as Basket;
}

beforeEach(() => {
  // Ensure cart is initialized for patching
  cartState.set({
    basketId: 'b1',
    basket: baseBasket(),
    validation: null,
    loading: false,
    lastError: undefined,
    operator: '0xoperator' as any,
    buyer: '0xbuyer' as any,
    orderPreview: null,
    lastOrderId: null,
    lastCheckout: null,
  });
});

function makeCatalogItemWithDelivery(src: string | string[]): AggregatedCatalogItem {
  const offer = {
    '@type': 'Offer',
    price: 80000,
    priceCurrency: 'CRC',
    checkout: null,
    // Intentionally use any here to allow array or string
    availableDeliveryMethod: src as any,
  } as any;

  return {
    seller: '0xDe374eCe6fa50E781e81aAC78e811b33D16912C7' as any,
    productCid: 'cid-123',
    publishedAt: Math.floor(Date.now() / 1000),
    linkKeccak: '0xdead',
    indexInChunk: 0,
    product: {
      '@context': ['https://schema.org/'],
      '@type': 'Product',
      sku: 'geforce-rtx-4090',
      name: 'GPU',
      offers: [offer],
    },
  } as AggregatedCatalogItem;
}

describe('basket PATCH payload is reference-only (no offerSnapshot)', () => {
  it('sends only seller, orderedItem.sku and quantity when source has array delivery methods', async () => {
    const srcArray = ['http://purl.org/goodrelations/v1#DeliveryModePickUp'];
    const item = makeCatalogItemWithDelivery(srcArray);

    const patchSpy = vi.spyOn(client, 'patchBasket').mockImplementation(async (_id, patch) => {
      const items = (patch as any).items as any[];
      expect(items).toHaveLength(1);
      const sent = items[0];
      expect('offerSnapshot' in sent).toBe(false);
      expect(typeof sent.seller).toBe('string');
      expect(sent.orderedItem?.sku).toBe(item.product.sku);
      expect(sent.orderQuantity).toBe(1);
      return baseBasket({ items: items as any });
    });

    await upsertLineItem(item, 1);
    expect(patchSpy).toHaveBeenCalledTimes(1);
  });

  it('sends only references when source has single-string delivery method', async () => {
    const srcStr = 'http://purl.org/goodrelations/v1#DeliveryModePickUp';
    const item = makeCatalogItemWithDelivery(srcStr);

    const patchSpy = vi.spyOn(client, 'patchBasket').mockImplementation(async (_id, patch) => {
      const items = (patch as any).items as any[];
      expect(items).toHaveLength(1);
      const sent = items[0];
      expect('offerSnapshot' in sent).toBe(false);
      expect(typeof sent.seller).toBe('string');
      expect(sent.orderedItem?.sku).toBe(item.product.sku);
      expect(sent.orderQuantity).toBe(1);
      return baseBasket({ items: items as any });
    });

    await upsertLineItem(item, 1);
    expect(patchSpy).toHaveBeenCalledTimes(1);
  });
});
