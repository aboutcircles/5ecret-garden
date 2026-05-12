import type { Address } from '@circles-sdk/utils';

export type AddTrustFlowContext = {
  actorType: 'avatar' | 'group' | 'gateway';
  actorAddress: Address;
  selectedTrustees: Address[];
  gatewayExpiry?: bigint;
  mode?: 'single' | 'batch';
};
