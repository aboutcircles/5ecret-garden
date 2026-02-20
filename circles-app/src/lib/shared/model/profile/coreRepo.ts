// src/lib/profiles/coreRepo.ts
import { get } from 'svelte/store';
import { circles } from '$lib/shared/state/circles';
import { BatchAggregator } from '$lib/shared/utils/batchAggregator';
import type { AppProfileCore, ProfileAddress } from './types';
import { FallbackImageUrl } from './types';
import { shortenAddress } from '$lib/shared/utils/shared';
import { createAvatarDataSource } from '$lib/shared/data/circles/avatarDataSource';
import { createProfileDataSource } from '$lib/shared/data/circles/profileDataSource';
import type { CirclesConfig } from '$lib/shared/config/circles';

// Cache of lowercased address -> Promise<AppProfileCore>
const coreCache = new Map<ProfileAddress, Promise<AppProfileCore>>();

function norm(address: string): ProfileAddress {
  const a = address.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(a)) throw new Error(`Invalid address: ${address}`);
  return a as ProfileAddress;
}

function applyFallback(address: ProfileAddress, avatar: any | undefined, profileDoc: any | undefined): AppProfileCore {
  const fallback: AppProfileCore = {
    name: shortenAddress(address),
    previewImageUrl: FallbackImageUrl.Logo,
  };

  const t = avatar?.type as string | undefined;
  if (!profileDoc?.previewImageUrl && (t === 'CrcV2_RegisterHuman' || t === 'CrcV1_Signup')) fallback.previewImageUrl = FallbackImageUrl.Person;
  if (t === 'CrcV2_RegisterGroup') fallback.previewImageUrl = FallbackImageUrl.Group;
  if (t === 'CrcV2_RegisterOrganization') fallback.previewImageUrl = FallbackImageUrl.Organization;

  let name = (profileDoc?.name ?? '').trim();
  let preview = (profileDoc?.previewImageUrl ?? '').trim();

  if (name.length === 0) name = fallback.name;
  if (preview.length === 0) preview = fallback.previewImageUrl!;

  return {
    name,
    previewImageUrl: preview,
    description: profileDoc?.description ?? undefined,
    location: profileDoc?.location ?? undefined,
    imageUrl: profileDoc?.imageUrl ?? undefined,
  };
}

async function fetchCoreBatch(addresses: ProfileAddress[]): Promise<Map<ProfileAddress, AppProfileCore>> {
  const sdk = get(circles);
  if (!sdk) throw new Error('No SDK instance found.');
  const avatarDataSource = createAvatarDataSource(sdk);
  const profileDataSource = createProfileDataSource(sdk);

  // 1) Avatar info batch
  const avatars = await avatarDataSource.getAvatarInfoBatch(addresses);
  const addrToAvatar = new Map<string, any>();
  for (const a of avatars) {
    if (a) addrToAvatar.set(a.avatar.toLowerCase(), a);
  }

  // 2) Collect CIDs
  const cids = [...new Set(avatars.filter((a: any) => a.cidV0).map((a: any) => a.cidV0 as string))];

  // 3) Batched RPC to fetch profile docs
  const cidToDoc: Record<string, any> = {};
  const chunkSize = 50;
  for (let i = 0; i < cids.length; i += chunkSize) {
    const chunk = cids.slice(i, i + chunkSize);
    const docs = await profileDataSource.getProfileByCidBatch(chunk);
    chunk.forEach((cid, idx) => {
      cidToDoc[cid] = docs[idx];
    });
  }

  // 4) Build results
  const out = new Map<ProfileAddress, AppProfileCore>();
  for (const a of addresses) {
    const avatar = addrToAvatar.get(a);
    const doc = avatar?.cidV0 ? cidToDoc[avatar.cidV0] : undefined;
    out.set(a, applyFallback(a, avatar, doc));
  }
  return out;
}

const aggregator = new BatchAggregator<ProfileAddress, AppProfileCore>({
  waitTimeMs: 20,
  maxBatchSize: 50,
  fetchFunction: fetchCoreBatch,
});

export async function getProfilesCoreBatch(
  addresses: ProfileAddress[]
): Promise<Map<ProfileAddress, AppProfileCore>> {
  // Normalize + dedupe first
  const unique = [...new Set(addresses.map((a) => norm(a)))];

  // Special-cases (mirror `getProfileCore`)
  const sdk = get(circles);
  const hub = sdk?.circlesConfig?.v2HubAddress?.toLowerCase();
  const migration = undefined;

  const out = new Map<ProfileAddress, AppProfileCore>();
  const pendingFromCache: Array<Promise<void>> = [];
  const toFetch: ProfileAddress[] = [];

  for (const addr of unique) {
    if (addr === '0x0000000000000000000000000000000000000001') {
      const p = Promise.resolve({ name: 'Transitive transfer', previewImageUrl: '/circles-token.svg' });
      coreCache.set(addr, p);
      pendingFromCache.push(p.then((v) => void out.set(addr, v)));
      continue;
    }
    if (hub && addr === hub) {
      const p = Promise.resolve({ name: 'Circles V2 Hub Contract', previewImageUrl: FallbackImageUrl.Logo });
      coreCache.set(addr, p);
      pendingFromCache.push(p.then((v) => void out.set(addr, v)));
      continue;
    }
    if (migration && addr === migration) {
      const p = Promise.resolve({ name: 'Circles V2 Migration Contract', previewImageUrl: FallbackImageUrl.Logo });
      coreCache.set(addr, p);
      pendingFromCache.push(p.then((v) => void out.set(addr, v)));
      continue;
    }

    const cached = coreCache.get(addr);
    if (cached) {
      pendingFromCache.push(cached.then((v) => void out.set(addr, v)));
      continue;
    }
    toFetch.push(addr);
  }

  if (toFetch.length > 0) {
    const fetched = await fetchCoreBatch(toFetch);
    for (const [addr, core] of fetched.entries()) {
      const p = Promise.resolve(core);
      coreCache.set(addr, p);
      out.set(addr, core);
    }
  }

  if (pendingFromCache.length > 0) {
    await Promise.all(pendingFromCache);
  }

  return out;
}

export async function getProfileCore(address: ProfileAddress): Promise<AppProfileCore> {
  const addr = norm(address);

  // Special-cases
  const sdk = get(circles);
  if (addr === '0x0000000000000000000000000000000000000001') {
    return { name: 'Transitive transfer', previewImageUrl: '/circles-token.svg' };
  }
  if (sdk) {
    const hub = sdk.circlesConfig?.v2HubAddress?.toLowerCase();
    const migration = (sdk.circlesConfig as CirclesConfig)?.migrationAddress?.toLowerCase();
    if (addr === hub) return { name: 'Circles V2 Hub Contract', previewImageUrl: FallbackImageUrl.Logo };
    if (addr === migration) return { name: 'Circles V2 Migration Contract', previewImageUrl: FallbackImageUrl.Logo };
  }

  const cached = coreCache.get(addr);
  if (cached) return cached;
  const p = aggregator.enqueue(addr).catch((err) => {
    coreCache.delete(addr);
    throw err;
  });
  coreCache.set(addr, p);
  return p;
}

export function invalidateProfileCore(address: ProfileAddress): void {
  coreCache.delete(norm(address));
}

export function invalidateAllProfileCore(): void {
  coreCache.clear();
}