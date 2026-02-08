import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cartState, upsertLineByIdentity, setLineQuantityByIdentity, removeLineByIdentity, setItems, patchBasket, cartApi, type OrderItemPreview } from '$lib/areas/market/cart/store';

function baseBasket(overrides: Partial<any> = {}): any {
  return {
    '@context': ['https://schema.org/', 'https://aboutcircles.com/contexts/circles-market/'],
    '@type': 'circles:Basket',
    basketId: 'b1',
    buyer: '0xbuyer' as any,
    operator: '0xoperator' as any,
    chainId: 100,
    status: 'Draft',
    items: [],
    createdAt: Date.now() / 1000,
    modifiedAt: Date.now() / 1000,
    ttlSeconds: 600,
    ...overrides,
  };
}

beforeEach(() => {
  // Reset cart to a minimal initialized state before every test
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

describe('identity-based cart mutations', () => {
  it('inserts new line without offerSnapshot (server derives canonical data)', async () => {
    const patchSpy = vi.spyOn(cartApi, 'patchBasket').mockImplementation(async (_id, patch) => {
      // Expect a single new item
      const items = (patch as any).items as OrderItemPreview[];
      expect(items).toHaveLength(1);
      expect(items[0].orderQuantity).toBe(2);
      expect(items[0].seller).toBe('sellercase');
      expect(items[0].orderedItem.sku).toBe('skucase');
      // No offerSnapshot should be present on outbound items
      expect('offerSnapshot' in (items[0] as any)).toBe(false);
      return baseBasket({ items });
    });

    await upsertLineByIdentity('SellerCASE', 'SkuCase', 2);
    expect(patchSpy).toHaveBeenCalledTimes(1);
  });

  it('updates existing line quantity by identity and preserves other fields', async () => {
    // Seed basket with an item
    const seeded: OrderItemPreview = {
      '@type': 'OrderItem',
      orderQuantity: 1,
      orderedItem: { '@type': 'Product', sku: 'ABC' },
      seller: '0xseller',
    };
    cartState.update((s) => ({ ...s, basket: baseBasket({ items: [seeded] }) }));
    const patchSpy = vi.spyOn(cartApi, 'patchBasket').mockImplementation(async (_id, patch) => {
      const items = (patch as any).items as OrderItemPreview[];
      expect(items).toHaveLength(1);
      // Same object shape but updated quantity
      expect(items[0].orderQuantity).toBe(5);
      expect(items[0].orderedItem.sku).toBe('abc');
      expect(items[0].seller).toBe('0xseller');
      // Ensure no offerSnapshot field is sent anymore
      expect('offerSnapshot' in (items[0] as any)).toBe(false);
      return baseBasket({ items });
    });

    await upsertLineByIdentity('0xseller', 'abc', 5);
    expect(patchSpy).toHaveBeenCalledTimes(1);
  });

  it('setLineQuantityByIdentity delegates to remove when quantity <= 0', async () => {
    // Seed with one item to remove
    const seeded: OrderItemPreview = {
      '@type': 'OrderItem',
      orderQuantity: 1,
      orderedItem: { '@type': 'Product', sku: 'TO-DEL' },
      seller: '0xseller',
    };
    cartState.update((s) => ({ ...s, basket: baseBasket({ items: [seeded] }) }));

    const removeSpy = vi.spyOn(cartApi, 'removeLineByIdentity');
    const patchSpy = vi.spyOn(cartApi, 'patchBasket').mockImplementation(async (_id, patch) => {
      const items = (patch as any).items as OrderItemPreview[];
      // Remove path should result in empty items
      expect(items).toHaveLength(0);
      return baseBasket({ items });
    });

    await setLineQuantityByIdentity('0xseller', 'to-del', 0);
    expect(removeSpy).toHaveBeenCalledOnce();
    expect(patchSpy).toHaveBeenCalledOnce();
  });

  it('removeLineByIdentity removes matching line by (seller, sku) case-insensitively', async () => {
    const items: OrderItemPreview[] = [
      { '@type': 'OrderItem', orderQuantity: 1, orderedItem: { '@type': 'Product', sku: 'One' }, seller: 'Alice' },
      { '@type': 'OrderItem', orderQuantity: 2, orderedItem: { '@type': 'Product', sku: 'Two' }, seller: 'Bob' },
    ];
    cartState.update((s) => ({ ...s, basket: baseBasket({ items }) }));
    const patchSpy = vi.spyOn(cartApi, 'patchBasket').mockImplementation(async (_id, patch) => {
      const patchedItems = (patch as any).items as OrderItemPreview[];
      expect(patchedItems).toHaveLength(1);
      // Only the non-matching line should remain
      expect(patchedItems[0].orderedItem.sku).toBe('two');
      expect(patchedItems[0].seller).toBe('bob');
      return baseBasket({ items: patchedItems });
    });

    await removeLineByIdentity('alice', 'one');
    expect(patchSpy).toHaveBeenCalledTimes(1);
  });
});
