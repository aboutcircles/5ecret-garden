import type { Address } from '@aboutcircles/sdk-types';

export type AddContactFlowContext = {
  selectedAddress: Address;
  trustVersion?: number;
};
