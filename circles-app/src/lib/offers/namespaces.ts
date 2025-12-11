import type { CidV0 } from './cid';
import { PinFailedError } from './errors';
import type { ProfilesBindings as CoreProfilesBindings } from '@circles-profile/core';
import {
  ensureProfileShape as coreEnsureProfileShape,
  ensureNamespaceChunkShape as coreEnsureNamespaceChunkShape,
  ensureNameIndexDocShape as coreEnsureNameIndexDocShape,
  loadProfileOrInit as coreLoadProfileOrInit,
  loadIndex as coreLoadIndex,
  insertIntoHead as coreInsertIntoHead,
  saveHeadAndIndex as coreSaveHeadAndIndex,
  rebaseAndSaveProfile as coreRebaseAndSaveProfile,
  fetchIpfsJson as coreFetchIpfsJson,
} from '@circles-profile/core';

// App-level bindings now extend core ProfilesBindings and add optional extras.
export interface CirclesBindings extends CoreProfilesBindings {
  // Optional app-only helper used as fallback in some legacy paths
  getProfile?(cid: CidV0): Promise<any | null>;
}

// Re-export the core fetcher to avoid duplication
export const fetchIpfsJson = coreFetchIpfsJson;

// Re-export normalizers directly from core
export const ensureProfileShape = coreEnsureProfileShape;
export const ensureNamespaceChunkShape = coreEnsureNamespaceChunkShape;
export const ensureNameIndexDocShape = coreEnsureNameIndexDocShape;

export async function loadProfileOrInit(
  circles: CirclesBindings,
  avatar: string,
): Promise<{ profile: any; profileCid: CidV0 | null }> {
  const res = await coreLoadProfileOrInit(circles, avatar);
  return { profile: res.profile, profileCid: res.profileCid as CidV0 | null };
}

export async function loadIndex(
  circles: CirclesBindings,
  indexCid: CidV0 | null,
): Promise<{ index: any; head: any; headCid: CidV0 | null }> {
  const res = await coreLoadIndex(circles, indexCid as any);
  return { index: res.index, head: res.head, headCid: res.headCid as CidV0 | null };
}

export const insertIntoHead = coreInsertIntoHead as (
  head: any,
  signedLink: any,
) => { rotated: boolean; closedHead?: any };

// Add PinFailedError wrapping while delegating to core saveHeadAndIndex
export async function saveHeadAndIndex(
  circles: CirclesBindings,
  head: any,
  index: any,
  closedHead?: any,
): Promise<{ headCid: CidV0; indexCid: CidV0 }> {
  try {
    const { headCid, indexCid } = await coreSaveHeadAndIndex(circles, head, index, closedHead);
    return { headCid: headCid as CidV0, indexCid: indexCid as CidV0 };
  } catch (e: any) {
    // We cannot distinguish head vs index here without duplicating logic; map to a generic PinFailedError
    throw new PinFailedError('head', String(e?.message ?? e));
  }
}

// Keep app-specific rebase behavior (fallback + PinFailedError), while reusing core shapers
export async function rebaseAndSaveProfile(
  circles: CirclesBindings,
  avatar: string,
  mutator: (profile: any) => void,
): Promise<CidV0> {
  try {
    // Delegate to core for the main flow
    const cid = await coreRebaseAndSaveProfile(circles, avatar, (p) => {
      const prof = coreEnsureProfileShape(p ?? {});
      mutator(prof);
    });
    return cid as CidV0;
  } catch (e: any) {
    // Preserve app error semantics
    throw new PinFailedError('profile', String(e?.message ?? e));
  }
}
