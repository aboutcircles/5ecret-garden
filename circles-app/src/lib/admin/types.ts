import type { Address } from '@circles-sdk/utils';
import type {
  MarketRoute,
  OdooProductListItem,
  CodeProductListItem,
  OdooConnectionListItem,
} from '$lib/gateway/adminClient';

export type AdminProductType = 'odoo' | 'codedispenser' | 'route';

export type AdminUnifiedProduct = {
  key: string;
  chainId: number;
  seller: Address;
  sku: string;
  route?: MarketRoute;
  odoo?: OdooProductListItem;
  code?: CodeProductListItem;
};

export type AdminOdooConnection = OdooConnectionListItem;

export function resolveAdminProductType(product: AdminUnifiedProduct): AdminProductType {
  if (product.route?.offerType === 'odoo' || product.odoo) {
    return 'odoo';
  }
  if (product.route?.offerType === 'codedispenser' || product.code) {
    return 'codedispenser';
  }
  return 'route';
}

export const adminProductTypeLabels: Record<AdminProductType, string> = {
  odoo: 'Odoo',
  codedispenser: 'Code dispenser',
  route: 'Route only',
};