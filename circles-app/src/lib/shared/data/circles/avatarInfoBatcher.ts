import type { Sdk } from '@aboutcircles/sdk';
import type { Address, AvatarInfo } from '@aboutcircles/sdk-types';
import { BatchAggregator } from '$lib/shared/model/profile/batchAggregator';

const batchers = new WeakMap<Sdk, BatchAggregator<Address, AvatarInfo | undefined>>();

function ensureBatcher(sdk: Sdk): BatchAggregator<Address, AvatarInfo | undefined> {
  const existing = batchers.get(sdk);
  if (existing) return existing;

  const batcher = new BatchAggregator<Address, AvatarInfo | undefined>({
    waitTimeMs: 20,
    maxBatchSize: 50,
    fetchFunction: async (addresses: Address[]) => {
      const rows = await sdk.rpc.avatar.getAvatarInfoBatch(addresses);
      const map = new Map<Address, AvatarInfo | undefined>();
      addresses.forEach((addr) => map.set(addr, undefined));
      rows.forEach((row: AvatarInfo) => map.set(row.avatar as Address, row));
      return map;
    },
  });

  batchers.set(sdk, batcher);
  return batcher;
}

export function getAvatarInfoBatched(
  sdk: Sdk,
  address: Address
): Promise<AvatarInfo | undefined> {
  return ensureBatcher(sdk).enqueue(address);
}
