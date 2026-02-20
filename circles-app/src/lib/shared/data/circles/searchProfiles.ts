import type { Sdk } from '@aboutcircles/sdk';
import type { SearchProfileResult } from '$lib/shared/model/profile/types';
import { SEARCH_POLICY } from '$lib/shared/ui/lists/utils/searchPolicies';

export type RpcSearchProfileResult = SearchProfileResult & {
  avatarVersion?: number;
};

function normalizeSearchProfile(raw: any | null | undefined): RpcSearchProfileResult | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const address =
    typeof raw.address === 'string'
      ? raw.address
      : typeof raw.owner === 'string'
        ? raw.owner
        : '';

  if (!address) return undefined;

  return {
    address: address as SearchProfileResult['address'],
    name: typeof raw.name === 'string' ? raw.name : undefined,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
    previewImageUrl: typeof raw.previewImageUrl === 'string' ? raw.previewImageUrl : undefined,
    location: typeof raw.location === 'string' ? raw.location : undefined,
    registeredName: typeof raw.registeredName === 'string' ? raw.registeredName : null,
    lastUpdatedAt: typeof raw.lastUpdatedAt === 'number' ? raw.lastUpdatedAt : undefined,
    avatarType: typeof raw.avatarType === 'string' ? raw.avatarType : (typeof raw.type === 'string' ? raw.type : undefined),
    avatarVersion: typeof raw.version === 'number' ? raw.version : undefined,
  };
}

export async function searchProfilesRpc(
  sdk: Sdk,
  params: {
    query: string;
    limit: number;
    offset?: number;
    avatarTypes?: string[];
  }
): Promise<RpcSearchProfileResult[]> {
  if (!sdk?.rpc) {
    return [];
  }

  const list = await sdk.rpc.profile.searchByAddressOrName(
    params.query,
    params.limit,
    params.offset ?? 0,
    params.avatarTypes,
  );

  return list.map(normalizeSearchProfile).filter((v): v is RpcSearchProfileResult => !!v);
}

export async function searchProfilesBootstrap(
  sdk: Sdk,
  params?: {
    limit?: number;
    offset?: number;
    avatarTypes?: string[];
  }
): Promise<RpcSearchProfileResult[]> {
  return await searchProfilesRpc(sdk, {
    query: SEARCH_POLICY.DEFAULT_BOOTSTRAP_QUERY,
    limit: params?.limit ?? SEARCH_POLICY.DEFAULT_BOOTSTRAP_LIMIT,
    offset: params?.offset ?? 0,
    avatarTypes: params?.avatarTypes,
  });
}
