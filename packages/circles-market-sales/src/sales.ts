import type { HttpTransport } from '@circles-market/core';
import type { AuthContext } from '@circles-market/session';
import type { SellerOrderDto, SellerOrdersPage, OrderId } from './salesTypes';

export interface SalesClientApi {
  list(opts?: { page?: number; pageSize?: number }): Promise<SellerOrdersPage>;
  get(orderId: OrderId): Promise<SellerOrderDto | null>;
}

export class SalesClient implements SalesClientApi {
  constructor(
    private readonly marketApiBase: string,
    private readonly http: HttpTransport,
    private readonly authContext: AuthContext,
  ) {
    this.marketApiBase = marketApiBase.replace(/\/$/, '');
  }

  async list(opts?: { page?: number; pageSize?: number }): Promise<SellerOrdersPage> {
    const token = this.requireToken();
    const params = new URLSearchParams();
    if (opts?.page != null) params.set('page', String(opts.page));
    if (opts?.pageSize != null) params.set('pageSize', String(opts.pageSize));

    return await this.http.request<SellerOrdersPage>({
      method: 'GET',
      url: `${this.marketApiBase}/api/cart/v1/orders/by-seller?${params.toString()}`,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async get(orderId: OrderId): Promise<SellerOrderDto | null> {
    const token = this.requireToken();
    try {
      return await this.http.request<SellerOrderDto>({
        method: 'GET',
        url: `${this.marketApiBase}/api/cart/v1/orders/${encodeURIComponent(orderId)}/as-seller`,
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e: any) {
      // accept the core HttpError type without importing to avoid circularities
      const status = (e && typeof e === 'object' && 'status' in e) ? (e as any).status : undefined;
      if (status === 404) return null;
      throw e;
    }
  }

  private requireToken(): string {
    const token = this.authContext.getToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }
}
