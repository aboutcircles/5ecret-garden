import type { Address } from '@circles-sdk/utils';
import type { GroupRow } from '@circles-sdk/data';
import type { AvatarRow, Sdk } from '@circles-sdk/sdk';
import { ethers } from 'ethers';
import { get, writable, type Readable } from 'svelte/store';
import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/shared/utils/getGroupsByOwnerBatch';

type SafeDiscoveryState = {
  safes: Address[];
  profileBySafe: Record<string, AvatarRow | undefined>;
  groupsByOwner: Record<Address, GroupRow[]>;
  isLoading: boolean;
  error: string | null;
};

const SAFE_CACHE_TTL_MS = 60_000;

type CacheEntry = {
  safes: Address[];
  fetchedAt: number;
};

const safeCache = new Map<string, CacheEntry>();

type RpcQueryResult = {
  result?: {
    columns?: string[];
    rows?: unknown[][];
  };
};

async function querySafesByOwnerCircles(sdk: Sdk, ownerAddress: string): Promise<Address[]> {
  if (!sdk?.circlesRpc) throw new Error('Circles SDK not initialized');
  const ownerLc = ownerAddress.toLowerCase();

  const response = await sdk.circlesRpc.call<RpcQueryResult>('circles_query', [
    {
      Namespace: 'V_Safe',
      Table: 'Owners',
      Columns: ['safeAddress'],
      Filter: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'owner',
          Value: ownerLc,
        },
      ],
      Order: [],
      Limit: 1000,
    },
  ]);

  const columns = response?.result?.columns ?? [];
  const rows = response?.result?.rows ?? [];

  // Find index of safeAddress column just in case ordering differs
  const colIdx = columns.findIndex((c) => c.toLowerCase() === 'safeaddress');

  const safesRaw = (colIdx >= 0 ? rows.map((r) => r[colIdx]) : rows.map((r) => r[0])).filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  );

  // Normalize, checksum and deduplicate (skip malformed values)
  const unique = Array.from(
    new Set(
      safesRaw
        .map((s) => {
          try {
            return ethers.getAddress(s).toLowerCase() as Address;
          } catch {
            return null;
          }
        })
        .filter((s): s is Address => Boolean(s))
    )
  );

  return unique;
}

export async function getSafesByOwner(
  sdk: Sdk,
  ownerAddress: string,
  opts: { forceRefresh?: boolean } = {}
): Promise<Address[]> {
  const key = ownerAddress.toLowerCase();
  const cached = safeCache.get(key);
  const isFresh = cached && Date.now() - cached.fetchedAt < SAFE_CACHE_TTL_MS;

  if (!opts.forceRefresh && isFresh) {
    return cached.safes;
  }

  const safes = await querySafesByOwnerCircles(sdk, ownerAddress);
  safeCache.set(key, { safes, fetchedAt: Date.now() });
  return safes;
}

export async function loadSafesProfileAndGroups(
  sdk: Sdk,
  safes: Address[]
): Promise<{
  profileBySafe: Record<string, AvatarRow | undefined>;
  groupsByOwner: Record<Address, GroupRow[]>;
}> {
  const [avatarInfo, groupInfo] = await Promise.all([
    sdk?.data?.getAvatarInfoBatch(safes) ?? [],
    getBaseAndCmgGroupsByOwnerBatch(sdk, safes),
  ]);

  const profileBySafe: Record<string, AvatarRow | undefined> = {};
  avatarInfo.forEach((info) => {
    profileBySafe[info.avatar] = info;
  });

  return { profileBySafe, groupsByOwner: groupInfo };
}

export function createSafeDiscoveryStore(
  ownerAddress: Address,
  sdk: Sdk
): {
  state: Readable<SafeDiscoveryState>;
  refresh: (opts?: { forceRefresh?: boolean }) => Promise<void>;
  addSafe: (address: Address) => void;
} {
  const state = writable<SafeDiscoveryState>({
    safes: [],
    profileBySafe: {},
    groupsByOwner: {},
    isLoading: true,
    error: null,
  });

  function mergeSafes(current: Address[], incoming: Address[]): Address[] {
    if (current.length === 0) return [...incoming];
    if (incoming.length === 0) return [...current];

    const existing = new Set(current);
    const merged = [...current];
    for (const safe of incoming) {
      if (!existing.has(safe)) merged.push(safe);
    }
    return merged;
  }

  function addSafe(address: Address) {
    const normalized = address.toLowerCase() as Address;
    const currentState = get(state);
    const nextSafes = mergeSafes(currentState.safes, [normalized]);
    state.update((current) => ({ ...current, safes: nextSafes }));

    const cacheKey = ownerAddress.toLowerCase();
    const cached = safeCache.get(cacheKey);
    if (cached) {
      safeCache.set(cacheKey, {
        ...cached,
        safes: mergeSafes(cached.safes, [normalized]),
      });
    }
  }

  async function refresh(opts: { forceRefresh?: boolean } = {}) {
    state.update((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const fetchedSafes = await getSafesByOwner(sdk, ownerAddress, opts);
      const currentState = get(state);
      const mergedSafes = mergeSafes(currentState.safes, fetchedSafes);
      state.update((current) => ({ ...current, safes: mergedSafes }));

      const currentSafes = mergedSafes.length ? mergedSafes : [];
      const { profileBySafe, groupsByOwner } = await loadSafesProfileAndGroups(
        sdk,
        currentSafes
      );

      state.update((current) => ({
        ...current,
        profileBySafe,
        groupsByOwner,
        isLoading: false,
      }));
    } catch (e) {
      console.error('Failed to load safes', e);
      state.update((current) => ({
        ...current,
        isLoading: false,
        error: 'Could not load your Safes. Please try again.',
      }));
    }
  }

  return { state, refresh, addSafe };
}
