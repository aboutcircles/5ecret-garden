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

async function withTimeout<T>(label: string, ms: number, p: Promise<T>): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms: ${label}`)), ms),
    ),
  ]);
}

async function querySafesByOwnerCircles(sdk: Sdk, ownerAddress: string): Promise<Address[]> {
  if (!sdk?.circlesRpc) throw new Error('Circles SDK not initialized');
  const ownerLc = ownerAddress.toLowerCase();

  console.log('[safeDiscovery] circles_query V_Safe.Owners owner=', ownerLc);
  const t0 = performance.now();
  const response = await withTimeout(
    'circles_query V_Safe.Owners',
    20_000,
    sdk.circlesRpc.call<RpcQueryResult>('circles_query', [
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
    ]),
  );
  console.log('[safeDiscovery] circles_query done in', Math.round(performance.now() - t0), 'ms');

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
  console.log('[safeDiscovery] loadSafesProfileAndGroups for', safes.length, 'safes');
  const t0 = performance.now();
  const [avatarInfo, groupInfo] = await Promise.all([
    withTimeout('getAvatarInfoBatch', 20_000, Promise.resolve(sdk?.data?.getAvatarInfoBatch(safes) ?? [])),
    withTimeout('getBaseAndCmgGroupsByOwnerBatch', 20_000, getBaseAndCmgGroupsByOwnerBatch(sdk, safes)),
  ]);
  console.log('[safeDiscovery] loadSafesProfileAndGroups done in', Math.round(performance.now() - t0), 'ms');

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
    console.log('[safeDiscovery] refresh start, owner=', ownerAddress, 'forceRefresh=', !!opts.forceRefresh);
    state.update((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const fetchedSafes = await getSafesByOwner(sdk, ownerAddress, opts);
      console.log('[safeDiscovery] fetched', fetchedSafes.length, 'safes');
      const currentState = get(state);
      const mergedSafes = mergeSafes(currentState.safes, fetchedSafes);
      state.update((current) => ({ ...current, safes: mergedSafes }));

      const currentSafes = mergedSafes.length ? mergedSafes : [];
      const { profileBySafe, groupsByOwner } = await loadSafesProfileAndGroups(
        sdk,
        currentSafes
      );

      console.log('[safeDiscovery] refresh complete, isLoading=false');
      state.update((current) => ({
        ...current,
        profileBySafe,
        groupsByOwner,
        isLoading: false,
      }));
    } catch (e) {
      console.error('[safeDiscovery] refresh failed:', e);
      const msg = (e as Error)?.message ?? '';
      state.update((current) => ({
        ...current,
        isLoading: false,
        error: msg.startsWith('Timed out')
          ? `${msg}. The Circles RPC isn't responding — please try again.`
          : 'Could not load your Safes. Please try again.',
      }));
    }
  }

  return { state, refresh, addSafe };
}
