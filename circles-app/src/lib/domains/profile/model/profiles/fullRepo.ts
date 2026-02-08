// src/lib/profiles/fullRepo.ts
import { get } from 'svelte/store';
import { circles } from '$lib/shared/state/circles';
import type { AppProfile, ProfileAddress } from './types';
import { FallbackImageUrl } from './types';
import { getProfilesBindings } from '$lib/domains/market/offers';
import { ensureProfileShape } from '@circles-profile/core';
import { rebaseAndSaveProfile } from '@circles-market/sdk';
import { invalidateProfileCore } from './coreRepo';

function norm(address: string): ProfileAddress {
  const a = address.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(a)) throw new Error(`Invalid address: ${address}`);
  return a as ProfileAddress;
}

function ensureNamespacesKeys(p: any): AppProfile {
  const out = ensureProfileShape(p) as AppProfile;
  if (!out.namespaces) out.namespaces = {};
  if (!out.signingKeys) out.signingKeys = {} as any;
  return out;
}

const fullCache = new Map<ProfileAddress, Promise<AppProfile>>();

async function loadOneFull(address: ProfileAddress, opts?: { pinApiBase?: string }): Promise<AppProfile> {
  const sdk = get(circles);
  if (!sdk) throw new Error('Circles SDK not initialized');

  // Special-cases
  if (address === '0x0000000000000000000000000000000000000001') {
    return ensureNamespacesKeys({ name: 'Transitive transfer', previewImageUrl: '/circles-token.svg', namespaces: {}, signingKeys: {} });
  }
  const hub = sdk.circlesConfig?.v2HubAddress?.toLowerCase();
  const migration = sdk.circlesConfig?.migrationAddress?.toLowerCase();
  if (address === hub) return ensureNamespacesKeys({ name: 'Circles V2 Hub Contract', previewImageUrl: FallbackImageUrl.Logo, namespaces: {}, signingKeys: {} });
  if (address === migration) return ensureNamespacesKeys({ name: 'Circles V2 Migration Contract', previewImageUrl: FallbackImageUrl.Logo, namespaces: {}, signingKeys: {} });

  // Cheap-first CID via avatar info
  let cid: string | null = null;
  try {
    const avatar = await sdk.data.getAvatarInfo(address);
    cid = avatar?.cidV0 ?? null;
  } catch {
    cid = null;
  }

  const { bindings } = getProfilesBindings({ pinApiBase: opts?.pinApiBase });

  // Fallback to bindings.getLatestProfileCid if missing
  if (!cid) {
    try {
      cid = await bindings.getLatestProfileCid(address);
    } catch {
      cid = null;
    }
  }

  if (!cid) {
    // No CID available: return minimal normalized
    return ensureNamespacesKeys({ avatar: address, namespaces: {}, signingKeys: {} });
  }

  try {
    const json = await bindings.getJsonLd(cid);
    return ensureNamespacesKeys(json);
  } catch {
    return ensureNamespacesKeys({ avatar: address, namespaces: {}, signingKeys: {} });
  }
}

export async function getProfileFull(address: ProfileAddress, opts?: { pinApiBase?: string }): Promise<AppProfile> {
  const addr = norm(address);
  let p = fullCache.get(addr);
  if (!p) {
    p = loadOneFull(addr, opts);
    fullCache.set(addr, p);
  }
  return await p;
}

export async function saveProfileFull(args: {
  address: ProfileAddress;
  pinApiBase: string;
  mutate: (p: AppProfile) => void;
}): Promise<{ profileCid: string; txHash?: string }> {
  const addr = norm(args.address);
  const { pinApiBase, mutate } = args;
  const { bindings } = getProfilesBindings({ pinApiBase });

  // Load base profile
  let base: any = null;
  try {
    const latest = await bindings.getLatestProfileCid(addr);
    if (latest) {
      try { base = await bindings.getJsonLd(latest); } catch { base = null; }
    }
  } catch {
    base = null;
  }
  let profile = ensureNamespacesKeys(base ?? { avatar: addr, namespaces: {}, signingKeys: {} });

  // Allow caller to mutate
  mutate(profile);

  // Save and update digest
  const profileCid = await rebaseAndSaveProfile(bindings as any, addr, (p: any) => {
    Object.assign(p, profile);
  });
  const txHash = await (bindings as any).updateAvatarProfileDigest(addr, profileCid);

  // Invalidate caches (both full and core)
  invalidateProfileFull(addr);
  invalidateProfileCore(addr);

  return { profileCid, txHash };
}

export function invalidateProfileFull(address: ProfileAddress): void {
  fullCache.delete(norm(address));
}

export function invalidateAllProfileFull(): void {
  fullCache.clear();
}
