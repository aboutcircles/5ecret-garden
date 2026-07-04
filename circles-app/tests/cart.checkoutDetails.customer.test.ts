import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cartState,
  updateBasketDetails,
  cartApi,
  type Basket,
} from '$lib/areas/market/cart/store';

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
    createdAt: Math.floor(Date.now() / 1000),
    modifiedAt: Math.floor(Date.now() / 1000),
    ttlSeconds: 600,
    shippingAddress: null as any,
    billingAddress: null as any,
    ageProof: null as any,
    contactPoint: null as any,
    customer: null as any,
    ...overrides,
  } as Basket;
}

beforeEach(() => {
  cartState.set({
    loading: false,
    lastError: null,
    basket: baseBasket(),
    validation: null,
    orderPreview: null,
    lastCheckout: null,
  });
});

describe('updateBasketDetails forwards the customer (buyer name) slot', () => {
  it('sends customer.givenName/familyName so offers requiring the customer slot are checkoutable', async () => {
    let seen: any = null;
    const patchSpy = vi.spyOn(cartApi, 'patchBasket').mockImplementation(async (_id: string, patch: any) => {
      seen = patch;
      return baseBasket({ customer: (patch as any).customer });
    });

    await updateBasketDetails({
      customer: { '@type': 'Person', givenName: 'Ada', familyName: 'Lovelace' },
      shippingAddress: {
        '@type': 'PostalAddress',
        streetAddress: '1 Test Street',
        addressLocality: 'Teststadt',
        postalCode: '10115',
        addressCountry: 'Germany',
      },
    });

    // Regression: the buyer name must reach the outbound patch. It was previously
    // dropped, so the server saw /customer/givenName as missing and the checkout
    // "Additional details" step could never validate.
    expect(patchSpy).toHaveBeenCalledTimes(1);
    expect(seen?.customer).toBeTruthy();
    expect(seen.customer.givenName).toBe('Ada');
    expect(seen.customer.familyName).toBe('Lovelace');
    // Sibling details still forwarded.
    expect(seen.shippingAddress?.streetAddress).toBe('1 Test Street');
  });

  it('omits customer when not provided (unchanged behavior for offers without the slot)', async () => {
    let seen: any = null;
    const patchSpy = vi.spyOn(cartApi, 'patchBasket').mockImplementation(async (_id: string, patch: any) => {
      seen = patch;
      return baseBasket();
    });

    await updateBasketDetails({
      contactPoint: { '@type': 'ContactPoint', email: 'buyer@example.com' },
    });

    expect(patchSpy).toHaveBeenCalledTimes(1);
    expect(seen?.customer).toBeUndefined();
    expect(seen.contactPoint?.email).toBe('buyer@example.com');
  });
});
