import type { Address } from '@circles-sdk/utils';

export type AdminNewConnectionFlowContext = {
  chainId: number;
  seller?: Address;
  odooUrl?: string;
  odooDb?: string;
  odooUid?: number;
  odooKey?: string;
  salePartnerId?: number | null;
  jsonrpcTimeoutMs?: number;
  fulfillInheritRequestAbort?: boolean;
  enabled?: boolean;
};
