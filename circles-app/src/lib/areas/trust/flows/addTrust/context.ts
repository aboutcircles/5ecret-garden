import type { Address } from '@aboutcircles/sdk-types';

export type AddTrustFlowContext = {
  actorType: 'avatar' | 'group' | 'gateway';
  actorAddress: Address;
  selectedTrustees: Address[];
  gatewayExpiry?: bigint;
  mode?: 'single' | 'batch';
};
