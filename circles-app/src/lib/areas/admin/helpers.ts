import type { Address } from '@circles-sdk/utils';
import type { CodeProductListItem, OdooProductListItem, MarketRoute } from '$lib/areas/admin/services/gateway/adminClient';
import type { AdminUnifiedProduct } from './types';

type ProductKey = string;
type ConnectionKey = string;

export function adminProductKey(chainId: number, seller: string, sku: string): ProductKey {
  return `${chainId}:${seller.toLowerCase()}:${sku.toLowerCase()}`;
}

export function adminOdooConnectionKey(chainId: number, seller: string): ConnectionKey {
  return `${chainId}:${seller.toLowerCase()}`;
}

export function combineAdminProducts(
  routes: MarketRoute[],
  odooProducts: OdooProductListItem[],
  codeProducts: CodeProductListItem[]
): AdminUnifiedProduct[] {
  const productMap = new Map<ProductKey, AdminUnifiedProduct>();

  function upsertBase(chainId: number, seller: string, sku: string): AdminUnifiedProduct {
    const key = adminProductKey(chainId, seller, sku);
    const existing = productMap.get(key);
    if (existing) return existing;

    const item: AdminUnifiedProduct = {
      key,
      chainId,
      seller: seller.toLowerCase() as Address,
      sku: sku.toLowerCase(),
    };
    productMap.set(key, item);
    return item;
  }

  for (const route of routes) {
    const entry = upsertBase(route.chainId, route.seller, route.sku);
    entry.route = route;
  }

  for (const odoo of odooProducts) {
    const entry = upsertBase(odoo.chainId, odoo.seller, odoo.sku);
    entry.odoo = odoo;
  }

  for (const code of codeProducts) {
    const entry = upsertBase(code.chainId, code.seller, code.sku);
    entry.code = code;
  }

  return Array.from(productMap.values()).sort((a, b) => {
    if (a.sku !== b.sku) return a.sku.localeCompare(b.sku);
    if (a.seller !== b.seller) return a.seller.localeCompare(b.seller);
    return a.chainId - b.chainId;
  });
}