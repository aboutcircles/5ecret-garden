import { PermissionlessGroup } from '@aboutcircles/sdk-permissionless-groups';
import type { Address } from '@aboutcircles/sdk-types';
import { getActiveConfig } from '$lib/shared/state/settings.svelte';

/**
 * Score-group (reputation-gated mint) integration.
 *
 * Wraps the SDK's `PermissionlessGroup`, which encapsulates the verified
 * on-chain mint/migration tx sequences and resolves the mint policy live from
 * `Hub.mintPolicies(group)` — so this layer never hand-rolls calldata or pins a
 * policy address. All addresses/URLs flow from the active `CirclesConfig`, so
 * the feature is automatically disabled on networks where it isn't configured
 * (chiado, rings).
 *
 * Reads use the standard chain RPC; the migration pathfinder uses the Circles
 * RPC (optionally overridden via `scoreGroupsRpcUrl`, since the path must be
 * routed by an indexer that knows the score-router/sink).
 */

/** Whether the active network has score-group minting configured. */
export function isScoreGroupConfigured(): boolean {
  const cfg = getActiveConfig();
  return Boolean(cfg.scoreGatedGroupAddress && cfg.scoreGroupsBackendUrl);
}

// Cache one instance per resolved configuration signature. PermissionlessGroup
// caches its resolved policy on the instance, so reusing it across calls saves
// a `Hub.mintPolicies` round-trip; the key changes when the network/RPC/group
// changes (e.g. rings toggle) so we never serve a stale-config instance.
let cached: { key: string; group: PermissionlessGroup } | null = null;

/**
 * Resolve a `PermissionlessGroup` for the active network's score group, or
 * `undefined` when score-group minting isn't configured. Callers should treat
 * `undefined` as "feature unavailable here" (hide the UI), not as an error.
 */
export function getScoreGroup(): PermissionlessGroup | undefined {
  const cfg = getActiveConfig();
  if (!cfg.scoreGatedGroupAddress || !cfg.scoreGroupsBackendUrl)
    return undefined;

  // Hub/Lift reads need standard eth_call; the runner uses chainRpcUrl for the
  // same reason, so mirror that here.
  const rpcUrl = cfg.chainRpcUrl ?? cfg.circlesRpcUrl;
  // The pathfinder (migration) reads from circlesRpcUrl; allow a dedicated
  // override for the score-group indexer.
  const circlesConfig = cfg.scoreGroupsRpcUrl
    ? { ...cfg, circlesRpcUrl: cfg.scoreGroupsRpcUrl }
    : cfg;

  const key = [
    cfg.scoreGatedGroupAddress,
    cfg.v2HubAddress,
    cfg.liftERC20Address,
    cfg.scoreGroupsBackendUrl,
    rpcUrl,
    circlesConfig.circlesRpcUrl,
  ].join('|');

  if (cached?.key === key) return cached.group;

  const group = new PermissionlessGroup({
    groupAddress: cfg.scoreGatedGroupAddress as Address,
    hubAddress: cfg.v2HubAddress,
    liftERC20Address: cfg.liftERC20Address,
    backendBaseUrl: cfg.scoreGroupsBackendUrl,
    rpcUrl,
    circlesConfig,
  });
  cached = { key, group };
  return group;
}
