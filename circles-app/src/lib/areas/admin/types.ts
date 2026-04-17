import type { Address } from '@circles-sdk/utils';
import type {
  MarketRoute,
  OdooProductListItem,
  CodeProductListItem,
  UnlockProductListItem,
  OdooConnectionListItem,
} from '$lib/areas/admin/services/gateway/adminClient';

export type AdminProductType = 'odoo' | 'codedispenser' | 'unlock' | 'route';

export type AdminUnifiedProduct = {
  key: string;
  chainId: number;
  seller: Address;
  sku: string;
  route?: MarketRoute;
  odoo?: OdooProductListItem;
  code?: CodeProductListItem;
  unlock?: UnlockProductListItem;
};

export type AdminOdooConnection = OdooConnectionListItem;

export function resolveAdminProductType(product: AdminUnifiedProduct): AdminProductType {
  if (product.route?.offerType === 'odoo' || product.odoo) {
    return 'odoo';
  }
  if (product.route?.offerType === 'codedispenser' || product.code) {
    return 'codedispenser';
  }
  if (product.route?.offerType === 'unlock' || product.unlock) {
    return 'unlock';
  }
  return 'route';
}

export const adminProductTypeLabels: Record<AdminProductType, string> = {
  odoo: 'Odoo',
  codedispenser: 'Code dispenser',
  unlock: 'Unlock',
  route: 'Route only',
};