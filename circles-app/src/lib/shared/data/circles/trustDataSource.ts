import type { Sdk } from '@aboutcircles/sdk';
import type { Address, AggregatedTrustRelation } from '@aboutcircles/sdk-types';

export interface TrustDataSource {
  getAggregatedTrustRelations(address: Address): Promise<AggregatedTrustRelation[]>;
  getCommonTrust(me: Address, other: Address): Promise<Address[]>;
}

export function createTrustDataSource(sdk: Sdk): TrustDataSource {
  return {
    async getAggregatedTrustRelations(address: Address): Promise<AggregatedTrustRelation[]> {
      return await sdk.data.getTrustRelations(address);
    },
    async getCommonTrust(me: Address, other: Address): Promise<Address[]> {
      return await sdk.rpc.trust.getCommonTrust(me, other);
    },
  };
}
