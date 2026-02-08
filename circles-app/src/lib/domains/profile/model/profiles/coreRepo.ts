// src/lib/profiles/coreRepo.ts
import { get } from 'svelte/store';
import { circles } from '$lib/shared/state/circles';
import { BatchAggregator } from '$lib/shared/utils/batchAggregator';
import type { AppProfileCore, ProfileAddress } from './types';
import { FallbackImageUrl } from './types';
import { shortenAddress } from '$lib/shared/utils/shared';

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

  // 1) Avatar info batch
  const avatars = await sdk.data.getAvatarInfoBatch(addresses);
  const addrToAvatar = new Map<string, any>();
  for (const a of avatars) addrToAvatar.set(a.avatar.toLowerCase(), a);

  // 2) Collect CIDs
  const cids = [...new Set(avatars.filter((a: any) => a.cidV0).map((a: any) => a.cidV0 as string))];

  // 3) Batched RPC to fetch profile docs
  const cidToDoc: Record<string, any> = {};
  const chunkSize = 50;
  for (let i = 0; i < cids.length; i += chunkSize) {
    const chunk = cids.slice(i, i + chunkSize);
    const rpc = await sdk.circlesRpc.call<any>("circles_getProfileByCidBatch", [chunk]);
    const docs: any[] = rpc.result ?? [];
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

export async function getProfileCore(address: ProfileAddress): Promise<AppProfileCore> {
  const addr = norm(address);

  // Special-cases
  const sdk = get(circles);
  if (addr === '0x0000000000000000000000000000000000000001') {
    return { name: 'Transitive transfer', previewImageUrl: '/circles-token.svg' };
  }
  if (sdk) {
    const hub = sdk.circlesConfig?.v2HubAddress?.toLowerCase();
    const migration = sdk.circlesConfig?.migrationAddress?.toLowerCase();
    if (addr === hub) return { name: 'Circles V2 Hub Contract', previewImageUrl: FallbackImageUrl.Logo };
    if (addr === migration) return { name: 'Circles V2 Migration Contract', previewImageUrl: FallbackImageUrl.Logo };
  }

  const cached = coreCache.get(addr);
  if (cached) return cached;
  const p = aggregator.enqueue(addr);
  coreCache.set(addr, p);
  return p;
}

export function invalidateProfileCore(address: ProfileAddress): void {
  coreCache.delete(norm(address));
}

export function invalidateAllProfileCore(): void {
  coreCache.clear();
}
