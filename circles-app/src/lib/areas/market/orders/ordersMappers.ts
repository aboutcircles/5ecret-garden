import type { OrderSnapshot } from '@circles-market/sdk';

type OrderSummarySource = {
  orderNumber?: string | number | null;
  paymentReference?: string | null;
  orderDate?: string | null;
  orderStatus?: string | null;
  totalPaymentDue?: { price?: number | null; priceCurrency?: string | null } | null;
  customer?: { '@id'?: string | null } | null;
};

export type MarketOrderSummaryListItem = {
  key: string;
  displayId: string;
  status?: string;
  total?: { price?: number | null; priceCurrency?: string | null } | null;
  customerId?: string | null;
  snapshot?: OrderSummarySource | OrderSnapshot;
};

export type MarketSalesListItem = {
  key: string;
  orderNumber: string;
  orderDate?: string;
  orderStatus?: string;
  paymentReference?: string | null;
};

export function mapMarketOrderSummaries(items: OrderSummarySource[]): MarketOrderSummaryListItem[] {
  return (items ?? []).map((s, i) => {
    const orderId = String(s?.orderNumber ?? `ord_${i}`);
    const displayId = String(s?.orderNumber ?? s?.paymentReference ?? `ord_${i}`);
    return {
      key: orderId,
      displayId,
      status: s?.orderStatus ?? undefined,
      total: s?.totalPaymentDue ?? null,
      customerId: s?.customer?.['@id'] ?? null,
      snapshot: s,
    };
  });
}

export function mapMarketSales(items: OrderSummarySource[]): MarketSalesListItem[] {
  return (items ?? []).map((o) => ({
    key: String(o?.orderNumber ?? ''),
    orderNumber: String(o?.orderNumber ?? ''),
    orderDate: typeof o?.orderDate === 'string' ? o.orderDate : undefined,
    orderStatus: typeof o?.orderStatus === 'string' ? o.orderStatus : undefined,
    paymentReference: (o?.paymentReference ?? null) as string | null,
  }));
}
