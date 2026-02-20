import type { Address } from '@aboutcircles/sdk-types';
import type { GroupRow } from '@aboutcircles/sdk-types';
import type { AvatarRow, Sdk } from '@aboutcircles/sdk';
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

function getSafesByOwnerApiEndpoint(checksumOwnerAddress: string): string {
  return `https://safe-transaction-gnosis-chain.safe.global/api/v1/owners/${checksumOwnerAddress}/safes/`;
}

async function querySafeTransactionService(ownerAddress: string): Promise<Address[]> {
  const checksumAddress = ethers.getAddress(ownerAddress);
  const requestUrl = getSafesByOwnerApiEndpoint(checksumAddress);

  const safesByOwnerResult = await fetch(requestUrl);
  const safesByOwner = await safesByOwnerResult.json();

  return (safesByOwner.safes ?? []).map((safe: string) => safe.toLowerCase() as Address);
}

export async function getSafesByOwner(
  ownerAddress: string,
  opts: { forceRefresh?: boolean } = {}
): Promise<Address[]> {
  const key = ownerAddress.toLowerCase();
  const cached = safeCache.get(key);
  const isFresh = cached && Date.now() - cached.fetchedAt < SAFE_CACHE_TTL_MS;

  if (!opts.forceRefresh && isFresh) {
    return cached.safes;
  }

  const safes = await querySafeTransactionService(ownerAddress);
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
      const fetchedSafes = await getSafesByOwner(ownerAddress, opts);
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
