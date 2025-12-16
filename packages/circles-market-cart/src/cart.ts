import type { HttpTransport } from '@circles-market/core';
import type { AuthContext } from '@circles-market/session';
import type {
  Basket,
  BasketItemInput,
  PostalAddressInput,
  ContactPointInput,
  PersonMinimalInput,
  ValidationResult,
} from './cartTypes';

export interface CartClient {
  createBasket(opts: { buyer: string; operator: string; chainId?: number }): Promise<{ basketId: string }>;
  setItems(opts: { basketId: string; items: BasketItemInput[] }): Promise<Basket>;
  setCheckoutDetails(opts: {
    basketId: string;
    shippingAddress?: PostalAddressInput;
    billingAddress?: PostalAddressInput;
    contactPoint?: ContactPointInput;
    ageProof?: PersonMinimalInput;
  }): Promise<Basket>;
  validateBasket(basketId: string): Promise<ValidationResult>;
  previewOrder(basketId: string): Promise<any>;
  checkoutBasket(opts: { basketId: string; buyer?: string }): Promise<{ orderId: string; paymentReference: string; basketId: string }>;
}

export class CartClientImpl implements CartClient {
  constructor(
    private readonly marketApiBase: string,
    private readonly http: HttpTransport,
    private readonly authContext: AuthContext,
  ) {}

  private maybeAuthHeaders(): Record<string, string> {
    const token = this.authContext.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
    }

  async createBasket(opts: { buyer: string; operator: string; chainId?: number }): Promise<{ basketId: string }> {
    const body = {
      buyer: opts.buyer,
      operator: opts.operator,
      chainId: opts.chainId ?? 100,
    };
    const res = await this.http.request<{ basketId: string }>({
      method: 'POST',
      url: `${this.marketApiBase}/api/cart/v1/baskets`,
      headers: { ...this.maybeAuthHeaders() },
      body,
    });
    return res;
  }

  async setItems(opts: { basketId: string; items: BasketItemInput[] }): Promise<Basket> {
    const items = opts.items.map((i) => ({
      seller: i.seller,
      orderedItem: { '@type': 'Product', sku: i.sku },
      orderQuantity: i.quantity,
      imageUrl: i.imageUrl,
    }));
    return await this.http.request<Basket>({
      method: 'PATCH',
      url: `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(opts.basketId)}`,
      headers: { ...this.maybeAuthHeaders() },
      body: { items },
    });
  }

  async setCheckoutDetails(opts: {
    basketId: string;
    shippingAddress?: PostalAddressInput;
    billingAddress?: PostalAddressInput;
    contactPoint?: ContactPointInput;
    ageProof?: PersonMinimalInput;
  }): Promise<Basket> {
    const body: any = {};
    if (opts.shippingAddress) body.shippingAddress = toPostal(opts.shippingAddress);
    if (opts.billingAddress) body.billingAddress = toPostal(opts.billingAddress);
    if (opts.contactPoint) body.contactPoint = toContact(opts.contactPoint);
    if (opts.ageProof) body.ageProof = toPerson(opts.ageProof);

    return await this.http.request<Basket>({
      method: 'PATCH',
      url: `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(opts.basketId)}`,
      headers: { ...this.maybeAuthHeaders() },
      body,
    });
  }

  async validateBasket(basketId: string): Promise<ValidationResult> {
    return await this.http.request<ValidationResult>({
      method: 'POST',
      url: `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(basketId)}/validate`,
      headers: { ...this.maybeAuthHeaders() },
    });
  }

  async previewOrder(basketId: string): Promise<any> {
    return await this.http.request<any>({
      method: 'POST',
      url: `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(basketId)}/preview`,
      headers: { ...this.maybeAuthHeaders() },
    });
  }

  async checkoutBasket(opts: { basketId: string; buyer?: string }): Promise<{ orderId: string; paymentReference: string; basketId: string }> {
    const qp = new URLSearchParams();
    const buyer = opts.buyer;
    const hasBuyer = typeof buyer === 'string' && buyer.length > 0;
    if (hasBuyer) {
      qp.set('buyer', buyer);
    }

    const qs = qp.toString();
    const hasQuery = qs.length > 0;

    const url = hasQuery
      ? `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(opts.basketId)}/checkout?${qs}`
      : `${this.marketApiBase}/api/cart/v1/baskets/${encodeURIComponent(opts.basketId)}/checkout`;

    return await this.http.request<{ orderId: string; paymentReference: string; basketId: string }>({
      method: 'POST',
      url,
      headers: { ...this.maybeAuthHeaders() },
    });
  }
}

function toPostal(a: PostalAddressInput): any {
  return {
    '@type': 'PostalAddress',
    ...a,
  };
}

function toContact(c: ContactPointInput): any {
  return {
    '@type': 'ContactPoint',
    ...c,
  };
}

function toPerson(p: PersonMinimalInput): any {
  return {
    '@type': 'Person',
    ...p,
  };
}
