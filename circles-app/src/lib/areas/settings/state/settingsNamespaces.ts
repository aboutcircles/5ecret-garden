import type { Address } from '@circles-sdk/utils';
import {
  loadProfileOrInit,
  normalizeEvmAddress as normalizeAddress,
  rebaseAndSaveProfile,
} from '@circles-market/sdk';
import { getProfilesBindings } from '$lib/areas/market/offers';
import { runTask } from '$lib/shared/utils/tasks';
import { removeProfileFromCache } from '$lib/shared/utils/profile';

export type NamespacesLoadResult = {
  resolvedAvatar: Address | null;
  namespaces: Record<string, string>;
};

export async function loadNamespacesProfileForSettings(params: {
  avatarAddress: Address | '';
  pinApiBase: string;
}): Promise<NamespacesLoadResult> {
  const { avatarAddress, pinApiBase } = params;
  if (!avatarAddress) {
    return { resolvedAvatar: null, namespaces: {} };
  }

  const norm = normalizeAddress(avatarAddress) as Address;
  const { bindings } = getProfilesBindings({ pinApiBase });
  const { profile } = await loadProfileOrInit(bindings, norm);
  const nsObj = profile.namespaces && typeof profile.namespaces === 'object' ? profile.namespaces : {};

  return {
    resolvedAvatar: norm,
    namespaces: { ...(nsObj as Record<string, string>) },
  };
}

export async function saveNamespacesProfileForSettings(params: {
  resolvedAvatar: Address | null;
  namespaces: Record<string, string>;
  pinApiBase: string;
}): Promise<void> {
  const { resolvedAvatar, namespaces, pinApiBase } = params;
  if (!resolvedAvatar) return;

  const { bindings } = getProfilesBindings({ pinApiBase });
  await runTask({
    name: 'Saving namespaces…',
    promise: (async () => {
      const cid = await rebaseAndSaveProfile(bindings, resolvedAvatar, (p: any) => {
        p.namespaces = namespaces;
      });
      await bindings.updateAvatarProfileDigest(resolvedAvatar, cid);
      removeProfileFromCache(resolvedAvatar);
    })(),
  });
}
