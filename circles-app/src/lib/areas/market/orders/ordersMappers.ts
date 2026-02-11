export type MarketOrderSummaryListItem = {
  key: string;
  displayId: string;
  status?: string;
  total?: { price?: number | null; priceCurrency?: string | null } | null;
  customerId?: string | null;
  snapshot?: any;
};

export type MarketSalesListItem = {
  key: string;
  orderNumber: string;
  orderDate?: string;
  orderStatus?: string;
  paymentReference?: string | null;
};

export function mapMarketOrderSummaries(items: any[]): MarketOrderSummaryListItem[] {
  return (items ?? []).map((s, i) => {
    const orderId = (s as any)?.orderNumber ?? `ord_${i}`;
    const displayId = (s as any)?.orderNumber ?? (s as any)?.paymentReference ?? `ord_${i}`;
    return {
      key: orderId,
      displayId,
      status: (s as any)?.orderStatus,
      total: (s as any)?.totalPaymentDue ?? null,
      customerId: (s as any)?.customer?.['@id'] ?? null,
      snapshot: s,
    } as MarketOrderSummaryListItem;
  });
}

export function mapMarketSales(items: any[]): MarketSalesListItem[] {
  return (items ?? []).map((o: any) => ({
    key: String(o?.orderNumber ?? ''),
    orderNumber: String(o?.orderNumber ?? ''),
    orderDate: typeof o?.orderDate === 'string' ? o.orderDate : undefined,
    orderStatus: typeof o?.orderStatus === 'string' ? o.orderStatus : undefined,
    paymentReference: (o?.paymentReference ?? null) as string | null,
  }));
}
