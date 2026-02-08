import { browser } from '$app/environment';
import { getMarketClient } from '$lib/integrations/market';
import type { OrderSnapshot, OrderStatusHistory, SellerOrderDto } from '@circles-market/sdk';
import type { OrderStatusSseEvent } from '$lib/orders/types';

export async function getOrdersByBuyer(
  page: number = 1,
  pageSize: number = 50,
): Promise<{ items: OrderSnapshot[] }> {
  if (!browser) {
    return { items: [] };
  }
  const client = getMarketClient();
  const items = await client.orders.list({ page, pageSize });
  return { items };
}

export async function getOrder(orderId: string): Promise<OrderSnapshot> {
  if (!browser) {
    throw new Error('getOrder() can only be used in the browser');
  }
  const client = getMarketClient();
  const snap = await client.orders.getById(orderId);
  if (!snap) {
    throw new Error(`Order not found: ${orderId}`);
  }
  return snap;
}

export async function getOrderStatusHistory(orderId: string): Promise<OrderStatusHistory> {
  if (!browser) {
    return { events: [] } as OrderStatusHistory;
  }
  return await getMarketClient().orders.getStatusHistory(orderId);
}

export async function getSalesBySeller(
  page: number = 1,
  pageSize: number = 50,
): Promise<{ items: SellerOrderDto[] }> {
  if (!browser) {
    return { items: [] };
  }
  const client = getMarketClient();
  const items = await client.sales.list({ page, pageSize });
  return { items: items.items ?? [] };
}

export async function getSale(orderId: string): Promise<SellerOrderDto> {
  if (!browser) {
    throw new Error('getSale() can only be used in the browser');
  }
  const client = getMarketClient();
  const snap = await client.sales.get(orderId);
  if (!snap) {
    throw new Error(`Sale not found: ${orderId}`);
  }
  return snap;
}

export function subscribeBuyerOrderEvents(
  onEvent: (evt: OrderStatusSseEvent) => void,
): () => void {
  if (!browser) {
    return () => {};
  }

  const client = getMarketClient();
  const hasToken = !!client.authContext.getToken();
  if (!hasToken) {
    return () => {};
  }

  return client.orders.subscribeStatusEvents(onEvent);
}
