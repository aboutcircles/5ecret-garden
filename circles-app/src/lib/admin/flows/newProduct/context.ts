import type { Address } from '@circles-sdk/utils';
import type { AggregatedCatalogItem } from '$lib/domains/market/model/types';
import type { AdminProductType } from '$lib/admin/types';

export type AdminNewProductFlowContext = {
  chainId: number;
  seller?: Address;
  catalogItem?: AggregatedCatalogItem;
  selectedType?: Exclude<AdminProductType, 'route'>;

  // shared
  enabled?: boolean;

  // code dispenser
  poolId?: string;
  downloadUrlTemplate?: string;
  codesTextarea?: string;

  // odoo
  selectedConnectionKey?: string;
  odooProductCode?: string;
};
