// src/lib/profiles/repo.ts
import { get } from 'svelte/store';
import { circles } from '$lib/shared/state/circles';
import { getProfilesBindings } from '$lib/domains/market/offers';
import type { AppProfile, AppProfileCore, ProfileAddress } from './types';
import { FallbackImageUrl } from './types';
import { BatchAggregator } from '$lib/utils/batchAggregator';
import { ensureProfileShape } from '@circles-profile/core';
import { rebaseAndSaveProfile } from '@circles-market/sdk';

// Simple lowercase validator
function normalizeAddress(addr: string): ProfileAddress {
  const a = addr.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(a)) {
    throw new Error(`Invalid EVM address: ${addr}`);
  }
  return a as ProfileAddress;
}

function shortenAddress(address: string): string {
  return address.slice(0, 6) + '...' + address.slice(-4);
}

function ensureNamespacesKeys(p: any): AppProfile {
  const out = ensureProfileShape(p) as AppProfile;
  if (!out.namespaces) out.namespaces = {};
  if (!out.signingKeys) out.signingKeys = {} as any;
  return out;
}

// In-memory caches
const coreCache = new Map<ProfileAddress, Promise<AppProfileCore>>();
const fullCache = new Map<ProfileAddress, Promise<AppProfile>>();

export function invalidateProfile(address: ProfileAddress): void {
  const key = address.toLowerCase() as ProfileAddress;
  coreCache.delete(key);
  fullCache.delete(key);
}

export function invalidateAllProfiles(): void {
  coreCache.clear();
  fullCache.clear();
}

export async function getLatestProfileCid(address: ProfileAddress): Promise<string | null> {
  const { bindings } = getProfilesBindings();
  return await bindings.getLatestProfileCid(address);
}

function pickCore(p: AppProfile): AppProfileCore {
  return {
    name: (p.name ?? '').trim(),
    description: p.description,
    location: p.location,
    imageUrl: p.imageUrl,
    previewImageUrl: p.previewImageUrl,
  };
}

// Concurrency helper
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  let active = 0;
  return await new Promise<R[]>((resolve, reject) => {
    const next = () => {
      if (i === items.length && active === 0) return resolve(results);
      while (active < limit && i < items.length) {
        const idx = i++;
        active++;
        Promise.resolve(fn(items[idx], idx))
          .then((res) => {
            results[idx] = res;
            active--;
            next();
          })
          .catch(reject);
      }
    };
    next();
  });
}

// Apply fallbacks (name and previewImageUrl) based on avatar type and content.
function applyFallbacks(address: ProfileAddress, avatar: any | undefined, profile: AppProfile): AppProfile {
  let name = (profile.name ?? '').trim();
  let preview = (profile.previewImageUrl ?? '').trim();

  // Determine fallback preview based on avatar type
  let fallbackPreview = FallbackImageUrl.Logo;
  const t = avatar?.type as string | undefined;
  if (t === 'CrcV2_RegisterHuman' || t === 'CrcV1_Signup') fallbackPreview = FallbackImageUrl.Person;
  else if (t === 'CrcV2_RegisterGroup') fallbackPreview = FallbackImageUrl.Group;
  else if (t === 'CrcV2_RegisterOrganization') fallbackPreview = FallbackImageUrl.Organization;

  if (name.length === 0) name = shortenAddress(address);
  if (preview.length === 0) preview = fallbackPreview;

  return { ...profile, name, previewImageUrl: preview };
}

async function loadFullProfiles(addresses: ProfileAddress[]): Promise<Map<ProfileAddress, AppProfile>> {
  const sdk = get(circles);
  if (!sdk) throw new Error('Circles SDK not initialized');

  // 1) Get avatar info batch for fallbacks/types
  const avatars = await sdk.data.getAvatarInfoBatch(addresses);
  const addrToAvatar = new Map<string, any>();
  for (const a of avatars) addrToAvatar.set(a.avatar.toLowerCase(), a);

  // 2) Get CIDs using Option A in parallel (cap 8)
  const cids = await mapWithConcurrency(addresses, 8, async (addr) => {
    try {
      return await getLatestProfileCid(addr);
    } catch {
      return null;
    }
  });

  // 3) Fetch JSON-LD for those with a CID (cap 8)
  const { bindings } = getProfilesBindings();
  const profilesJson = await mapWithConcurrency(cids, 8, async (cid) => {
    if (!cid) return null as any;
    try {
      return await bindings.getJsonLd(cid);
    } catch {
      return null as any;
    }
  });

  // 4) Build final normalized profiles with fallbacks
  const result = new Map<ProfileAddress, AppProfile>();
  addresses.forEach((addr, i) => {
    const raw = profilesJson[i] ?? null;
    const normalized = ensureNamespacesKeys(raw ?? { avatar: addr, namespaces: {}, signingKeys: {} });
    const withFallbacks = applyFallbacks(addr, addrToAvatar.get(addr), normalized);
    result.set(addr, withFallbacks);
  });
  return result;
}

const coreAggregator = new BatchAggregator<ProfileAddress, AppProfileCore>({
  waitTimeMs: 20,
  maxBatchSize: 50,
  fetchFunction: async (items) => {
    const fullMap = await loadFullProfiles(items);
    const map = new Map<ProfileAddress, AppProfileCore>();
    for (const [addr, prof] of fullMap.entries()) {
      map.set(addr, pickCore(prof));
    }
    return map;
  },
});

export async function getProfileFull(address: ProfileAddress): Promise<AppProfile> {
  const addr = normalizeAddress(address);

  // Special-case addresses
  const sdk = get(circles);
  if (addr === '0x0000000000000000000000000000000000000001') {
    return ensureNamespacesKeys({ name: 'Transitive transfer', previewImageUrl: '/circles-token.svg', namespaces: {}, signingKeys: {} });
  }
  if (sdk) {
    const hub = sdk.circlesConfig?.v2HubAddress?.toLowerCase();
    const migration = sdk.circlesConfig?.migrationAddress?.toLowerCase();
    if (addr === hub) {
      return ensureNamespacesKeys({ name: 'Circles V2 Hub Contract', previewImageUrl: FallbackImageUrl.Logo, namespaces: {}, signingKeys: {} });
    }
    if (addr === migration) {
      return ensureNamespacesKeys({ name: 'Circles V2 Migration Contract', previewImageUrl: FallbackImageUrl.Logo, namespaces: {}, signingKeys: {} });
    }
  }

  let promise = fullCache.get(addr);
  if (!promise) {
    promise = (async () => {
      const map = await loadFullProfiles([addr]);
      return map.get(addr)!;
    })();
    fullCache.set(addr, promise);
  }
  return await promise;
}

export async function getProfileCore(address: ProfileAddress): Promise<AppProfileCore> {
  const addr = normalizeAddress(address);

  // Special-case addresses handled similarly to full
  const sdk = get(circles);
  if (addr === '0x0000000000000000000000000000000000000001') {
    return { name: 'Transitive transfer', previewImageUrl: '/circles-token.svg' } as AppProfileCore;
  }
  if (sdk) {
    const hub = sdk.circlesConfig?.v2HubAddress?.toLowerCase();
    const migration = sdk.circlesConfig?.migrationAddress?.toLowerCase();
    if (addr === hub) return { name: 'Circles V2 Hub Contract', previewImageUrl: FallbackImageUrl.Logo } as AppProfileCore;
    if (addr === migration) return { name: 'Circles V2 Migration Contract', previewImageUrl: FallbackImageUrl.Logo } as AppProfileCore;
  }

  let promise = coreCache.get(addr);
  if (!promise) {
    promise = coreAggregator.enqueue(addr);
    coreCache.set(addr, promise);
  }
  return await promise;
}

// Batch API for contacts store and other list views
export async function getProfilesCoreBatch(addresses: ProfileAddress[]): Promise<Map<ProfileAddress, AppProfileCore>> {
  const addrs = addresses.map((a) => normalizeAddress(a));
  const full = await loadFullProfiles(addrs);
  const map = new Map<ProfileAddress, AppProfileCore>();
  for (const [addr, prof] of full.entries()) {
    map.set(addr, pickCore(prof));
  }
  return map;
}

export async function saveProfile(args: {
  address: ProfileAddress;
  pinApiBase: string; // required for writes (putJsonLd)
  mutate: (profile: AppProfile) => void; // called with normalized profile
}): Promise<{ profileCid: string; txHash?: string }> {
  const { address, pinApiBase, mutate } = args;
  const addr = normalizeAddress(address);

  const { bindings } = getProfilesBindings({ pinApiBase });

  // Load latest profile via Option A
  const cid = await bindings.getLatestProfileCid(addr);
  let base: any = null;
  if (cid) {
    try { base = await bindings.getJsonLd(cid); } catch { base = null; }
  }
  let profile = ensureNamespacesKeys(base ?? { avatar: addr, namespaces: {}, signingKeys: {} });

  // Allow caller to mutate normalized profile
  mutate(profile);

  // Persist via rebaseAndSaveProfile and update digest
  const profileCid = await rebaseAndSaveProfile(bindings as any, addr, (p: any) => {
    Object.assign(p, profile);
  });

  const txHash = await (bindings as any).updateAvatarProfileDigest(addr, profileCid);

  // Invalidate caches
  invalidateProfile(addr);

  return { profileCid, txHash };
}
