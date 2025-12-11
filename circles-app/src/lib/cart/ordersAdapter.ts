// src/lib/cart/ordersAdapter.ts
// Thin compatibility wrappers that delegate to the SDK's Orders API.
import { getMarketClient } from '$lib/sdk/marketClient';

export type { OrderSnapshot } from '$lib/cart/types';

export type OrderStatusEvent = {
  orderId?: string;
  paymentReference?: string | null;
  oldStatus?: string | null;
  newStatus: string;
  changedAt: string;
};

export type OrderStatusHistory = {
  orderId: string;
  events: OrderStatusEvent[];
};

export async function getOrdersByBuyer(page = 1, pageSize = 50): Promise<{ items: any[] }> {
  const client = getMarketClient();
  const items = await client.orders.list({ page, pageSize });
  return { items };
}

export async function getOrder(orderId: string): Promise<any | null> {
  const client = getMarketClient();
  return await client.orders.getById(orderId);
}

export async function getOrderStatusHistory(orderId: string): Promise<OrderStatusHistory> {
  const client = getMarketClient();
  return await client.orders.getStatusHistory(orderId);
}

export function subscribeBuyerOrderEvents(onEvent: (e: OrderStatusEvent) => void): () => void {
  const client = getMarketClient();
  return client.orders.subscribeStatusEvents(onEvent as any);
}
