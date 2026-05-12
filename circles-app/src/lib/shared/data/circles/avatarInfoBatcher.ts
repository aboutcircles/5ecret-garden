import type { Sdk } from '@circles-sdk/sdk';
import type { Address } from '@circles-sdk/utils';
import type { AvatarRow } from '@circles-sdk/data';
import { BatchAggregator } from '$lib/shared/model/profile/batchAggregator';

const batchers = new WeakMap<Sdk, BatchAggregator<Address, AvatarRow | undefined>>();

function ensureBatcher(sdk: Sdk): BatchAggregator<Address, AvatarRow | undefined> {
  const existing = batchers.get(sdk);
  if (existing) return existing;

  const batcher = new BatchAggregator<Address, AvatarRow | undefined>({
    waitTimeMs: 20,
    maxBatchSize: 50,
    fetchFunction: async (addresses: Address[]) => {
      const rows = await sdk.data.getAvatarInfoBatch(addresses);
      const map = new Map<Address, AvatarRow | undefined>();
      addresses.forEach((addr) => map.set(addr, undefined));
      rows.forEach((row) => map.set(row.avatar as Address, row));
      return map;
    },
  });

  batchers.set(sdk, batcher);
  return batcher;
}

export function getAvatarInfoBatched(
  sdk: Sdk,
  address: Address
): Promise<AvatarRow | undefined> {
  return ensureBatcher(sdk).enqueue(address);
}
