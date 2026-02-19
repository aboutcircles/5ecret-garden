import type { Address } from '@aboutcircles/sdk-types';
import type { AggregatedCatalogItem } from '$lib/areas/market/model';
import type { AdminProductType } from '$lib/areas/admin/types';

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

  // odoo connection details (used when creating a new connection inline)
  odooUrl?: string;
  odooDb?: string;
  odooUid?: number;
  odooKey?: string;
  salePartnerId?: number | null;
  jsonrpcTimeoutMs?: number;
  fulfillInheritRequestAbort?: boolean;
};
