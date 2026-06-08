import type { Address } from '@aboutcircles/sdk-types';
import type {
  MarketRoute,
  OdooProductListItem,
  CodeProductListItem,
  UnlockProductListItem,
  OdooConnectionListItem,
  WcProductListItem,
  WcConnectionListItem,
} from '$lib/areas/admin/services/gateway/adminClient';

export type AdminProductType = 'odoo' | 'codedispenser' | 'unlock' | 'woocommerce' | 'route';

export type AdminUnifiedProduct = {
  key: string;
  chainId: number;
  seller: Address;
  sku: string;
  route?: MarketRoute;
  odoo?: OdooProductListItem;
  code?: CodeProductListItem;
  unlock?: UnlockProductListItem;
  wc?: WcProductListItem;
};

export type AdminOdooConnection = OdooConnectionListItem;
export type AdminWcConnection = WcConnectionListItem;

export function resolveAdminProductType(product: AdminUnifiedProduct): AdminProductType {
  if (product.route?.offerType === 'odoo' || product.odoo) return 'odoo';
  if (product.route?.offerType === 'codedispenser' || product.code) return 'codedispenser';
  if (product.route?.offerType === 'unlock' || product.unlock) return 'unlock';
  if (product.route?.offerType === 'woocommerce' || product.wc) return 'woocommerce';
  return 'route';
}

export const adminProductTypeLabels: Record<AdminProductType, string> = {
  odoo: 'Odoo',
  codedispenser: 'Code dispenser',
  unlock: 'Unlock',
  woocommerce: 'WooCommerce',
  route: 'Route only',
};