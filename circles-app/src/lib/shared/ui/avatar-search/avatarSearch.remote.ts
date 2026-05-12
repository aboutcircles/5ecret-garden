import type { Sdk } from '@aboutcircles/sdk';
import { SEARCH_POLICY } from '$lib/shared/ui/lists/utils/searchPolicies';
import { searchProfilesRpc } from '$lib/shared/data/circles/searchProfiles';
import { computeTextRank } from './avatarSearch.rank';
import { makeBaseAvatarSearchItem, normalizeAvatarSearchAddress } from './avatarSearch.merge';
import type { AvatarSearchItem } from './avatarSearch.types';

export async function searchRemoteAvatarRows(params: {
  sdk: Sdk | null | undefined;
  query: string;
  avatarTypes?: string[];
}): Promise<AvatarSearchItem[]> {
  const { sdk, query, avatarTypes } = params;
  if (!sdk?.rpc) return [];

  const list = await searchProfilesRpc(sdk, {
    query,
    limit: SEARCH_POLICY.DEFAULT_REMOTE_LIMIT,
    offset: 0,
    avatarTypes,
  });

  return list
    .map((entry): AvatarSearchItem | null => {
      const address = normalizeAvatarSearchAddress(entry?.address);
      if (!address) return null;

      const item = makeBaseAvatarSearchItem(address);
      item.name = typeof entry?.name === 'string' ? entry.name : undefined;
      item.avatarType = typeof entry?.avatarType === 'string' ? entry.avatarType : undefined;
      item.avatarVersion = typeof entry?.avatarVersion === 'number' ? entry.avatarVersion : undefined;
      item.hasProfile = !!(item.name && item.name.trim().length > 0);
      item.remoteRank = computeTextRank(item, query.toLowerCase());
      return item;
    })
    .filter((v): v is AvatarSearchItem => v !== null);
}
