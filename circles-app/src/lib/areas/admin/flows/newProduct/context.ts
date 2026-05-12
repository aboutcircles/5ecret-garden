import type { Address } from '@aboutcircles/sdk-types';
import type { AggregatedCatalogItem } from '$lib/areas/market/model';
import type { AdminProductType } from '$lib/areas/admin/types';
import type { UnlockKeyManagerMode } from '$lib/areas/admin/services/gateway/adminClient';

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
  useLocalStock?: boolean;
  localAvailableQty?: number | null;

  // odoo connection details (used when creating a new connection inline)
  odooUrl?: string;
  odooDb?: string;
  odooUid?: number;
  odooKey?: string;
  salePartnerId?: number | null;
  jsonrpcTimeoutMs?: number;
  fulfillInheritRequestAbort?: boolean;

  // unlock
  lockAddress?: Address | '';
  rpcUrl?: string;
  servicePrivateKey?: string;
  unlockTimingMode?: 'duration' | 'expiration';
  durationSeconds?: number | null;
  expirationUnix?: number | null;
  keyManagerMode?: UnlockKeyManagerMode;
  fixedKeyManager?: Address | '';
  locksmithBase?: string;
  locksmithToken?: string;
  totalInventory?: number | null;
};
