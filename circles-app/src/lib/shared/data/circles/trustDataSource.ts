import type { Sdk } from '@circles-sdk/sdk';
import type { Address } from '@circles-sdk/utils';
import type { TrustRelationRow } from '@circles-sdk/data';

export interface TrustDataSource {
  getAggregatedTrustRelations(address: Address): Promise<TrustRelationRow[]>;
  getCommonTrust(me: Address, other: Address): Promise<Address[]>;
}

export function createTrustDataSource(sdk: Sdk): TrustDataSource {
  return {
    async getAggregatedTrustRelations(address: Address): Promise<TrustRelationRow[]> {
      return await sdk.data.getAggregatedTrustRelations(address);
    },
    async getCommonTrust(me: Address, other: Address): Promise<Address[]> {
      const resp = await sdk.circlesRpc.call<Address[]>('circles_getCommonTrust', [me, other]);
      return (resp?.result ?? []) as Address[];
    },
  };
}
