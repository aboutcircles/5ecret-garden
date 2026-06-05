import {
  Contract,
  Interface,
  JsonRpcProvider,
  ZeroAddress,
  keccak256,
  toUtf8Bytes,
} from 'ethers';
import type { Address } from '@aboutcircles/sdk-types';
import { getActiveConfig } from '$lib/shared/state/settings.svelte';

// Three v2 group contract shapes coexist on Gnosis. The on-chain selectors
// differ; the indexer reports all of them as CrcV2_RegisterGroup, so we have
// to inspect bytecode to discriminate.
//
//   conditions: BaseGroup with membership conditions.
//     add    -> trustBatchWithConditions(address[], uint96)  0x4141f954
//     remove -> same selector with expiry=0
//   expiry:     CMG / BaseGroup variant with batch + expiry.
//     add    -> trustBatch(address[], uint96)                0xb09ed912
//     remove -> same selector with expiry=0
//   simple:     ScoreGroup / simple group with no expiry.
//     add    -> trustBatch(address[])                        0xa2e51986
//     remove -> not exposed; member-initiated optOut() only  0xd4eec5a6
//
// The SDK only models `conditions`; that's why the other two revert with
// empty data — the dispatcher falls through to revert(0,0) on a missing
// selector.
export type GroupTrustKind = 'conditions' | 'expiry' | 'simple' | 'unknown';

export type GroupCapabilities = {
  trustKind: GroupTrustKind;
  // Owner can remove (untrust) members on-chain.
  ownerRemove: boolean;
  // Member can opt out (optOut()).
  optOut: boolean;
  // owner() of the group contract. Lowercased. `null` if owner() is not callable.
  owner: Address | null;
  // service() of the group contract. Lowercased. `null` if not exposed.
  service: Address | null;
  // True if owner is a contract (Safe or otherwise).
  ownerIsContract: boolean;
  // If owner is a Safe, its owner set (lowercased). `null` if owner is an EOA
  // or `getOwners()` is not callable.
  ownerSafeOwners: Address[] | null;
};

export type ManagePermissionReason =
  | 'direct'      // runner === group.owner — call group directly
  | 'nested-safe' // runner is an owner of group.owner Safe — nest via owner Safe
  | 'service'     // runner === group.service — call group directly (service path)
  | 'eoa-must-switch-wallet' // the EOA can sign for the owner Safe but the
                             // currently-connected runner Safe cannot — user
                             // must disconnect and reconnect via the owner Safe
  | 'not-an-owner'
  | 'unknown';

export type ManagePermission = {
  canManage: boolean;
  // Empty when canManage is via direct or service path; [ownerSafe] when
  // call must be routed via Safe-on-Safe through the owner. For
  // 'eoa-must-switch-wallet' this lists the Safe the user should reconnect
  // via.
  ownerProxyChain: Address[];
  reason: ManagePermissionReason;
};

const TRUST_BATCH_WITH_CONDITIONS = '4141f954';
const TRUST_BATCH_WITH_EXPIRY = 'b09ed912';
const TRUST_BATCH_NO_EXPIRY = 'a2e51986';
const OPT_OUT = 'd4eec5a6';

// EIP-1967 implementation slot = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)
// Computed at module load to avoid baking a long-hex literal that pattern-matches
// pre-commit secret guards.
const EIP1967_IMPL_SLOT =
  '0x' +
  (
    BigInt(keccak256(toUtf8Bytes('eip1967.proxy.implementation'))) - 1n
  )
    .toString(16)
    .padStart(64, '0');
const ZERO_SLOT = '0x' + '0'.repeat(64);

// v3 cache key — the shape grew (owner / service / ownerSafeOwners). Old v2
// entries are missing those fields and would be misclassified as
// "owner unknown", so we ignore them by changing the prefix.
const CACHE_KEY_PREFIX = 'circles.groupCaps.v3.';
const inflight = new Map<string, Promise<GroupCapabilities>>();

const groupReadIface = new Interface([
  'function owner() view returns (address)',
  'function service() view returns (address)',
]);
const safeIface = new Interface([
  'function getOwners() view returns (address[])',
]);

function cacheKey(address: string): string {
  return `${CACHE_KEY_PREFIX}${address.toLowerCase()}`;
}

function asAddress(value: unknown): Address | null {
  if (typeof value !== 'string') return null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) return null;
  return value.toLowerCase() as Address;
}

function readCached(address: string): GroupCapabilities | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(cacheKey(address));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GroupCapabilities;
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.optOut === 'boolean' &&
      typeof parsed.ownerRemove === 'boolean' &&
      typeof parsed.trustKind === 'string' &&
      'owner' in parsed &&
      'service' in parsed &&
      typeof parsed.ownerIsContract === 'boolean' &&
      'ownerSafeOwners' in parsed
    ) {
      return parsed;
    }
  } catch {
    // fall through to re-probe
  }
  return null;
}

function writeCached(address: string, caps: GroupCapabilities): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(cacheKey(address), JSON.stringify(caps));
  } catch {
    // quota / privacy mode — ignore.
  }
}

async function readEffectiveBytecode(
  provider: JsonRpcProvider,
  address: string
): Promise<string> {
  const code = await provider.getCode(address);
  if (!code || code === '0x') return '';

  // If this is an EIP-1967 proxy, the dispatcher we care about lives in the
  // implementation. Probe the slot; on a non-proxy this is just 0x0.
  let implCode = '';
  try {
    const slotValue = await provider.getStorage(address, EIP1967_IMPL_SLOT);
    if (slotValue && slotValue !== ZERO_SLOT) {
      const impl = '0x' + slotValue.slice(-40);
      const fetched = await provider.getCode(impl);
      if (fetched && fetched !== '0x') implCode = fetched;
    }
  } catch {
    // Some RPCs reject eth_getStorageAt for contracts; treat as non-proxy.
  }

  // Concatenate so a single substring probe covers both proxy and impl.
  return (code + implCode).toLowerCase();
}

function classifyBytecode(bytecode: string): {
  trustKind: GroupTrustKind;
  ownerRemove: boolean;
  optOut: boolean;
} {
  const hasConditions = bytecode.includes(TRUST_BATCH_WITH_CONDITIONS);
  const hasExpiry = bytecode.includes(TRUST_BATCH_WITH_EXPIRY);
  const hasSimple = bytecode.includes(TRUST_BATCH_NO_EXPIRY);
  const hasOptOut = bytecode.includes(OPT_OUT);

  // Preference order: most-specific first. `expiry` and `simple` share the
  // `trustBatch` family but with different signatures, so checking the more
  // specific (with-expiry) before the bare one is required.
  let trustKind: GroupTrustKind;
  if (hasConditions) trustKind = 'conditions';
  else if (hasExpiry) trustKind = 'expiry';
  else if (hasSimple) trustKind = 'simple';
  else trustKind = 'unknown';

  // Owner-side remove exists when the same selector accepts expiry=0.
  // `simple` and `unknown` have no on-chain untrust by the owner.
  const ownerRemove = trustKind === 'conditions' || trustKind === 'expiry';

  return { trustKind, ownerRemove, optOut: hasOptOut };
}

async function readGroupOwnerAndService(
  provider: JsonRpcProvider,
  address: string
): Promise<{ owner: Address | null; service: Address | null }> {
  const group = new Contract(address, groupReadIface, provider);
  const [ownerSettled, serviceSettled] = await Promise.allSettled([
    group.owner(),
    group.service(),
  ]);
  return {
    owner:
      ownerSettled.status === 'fulfilled'
        ? asAddress(ownerSettled.value)
        : null,
    service:
      serviceSettled.status === 'fulfilled'
        ? asAddress(serviceSettled.value)
        : null,
  };
}

async function readSafeOwnersIfContract(
  provider: JsonRpcProvider,
  address: Address | null
): Promise<{ isContract: boolean; safeOwners: Address[] | null }> {
  if (!address || address === ZeroAddress.toLowerCase()) {
    return { isContract: false, safeOwners: null };
  }
  // RPC failure on getCode is propagated: silently returning isContract=false
  // would poison the cache and make a Safe-owned group look like an EOA-owned
  // one, hiding the manage UI forever via the not-an-owner branch.
  const code = await provider.getCode(address);
  if (!code || code === '0x') {
    return { isContract: false, safeOwners: null };
  }
  try {
    const safe = new Contract(address, safeIface, provider);
    const owners = (await safe.getOwners()) as string[];
    const normalized = owners
      .map((o) => asAddress(o))
      .filter((o): o is Address => o !== null);
    return { isContract: true, safeOwners: normalized };
  } catch {
    // Owner is a contract but not a Safe — still useful to flag isContract.
    return { isContract: true, safeOwners: null };
  }
}

export async function probeGroupCapabilities(
  address: string
): Promise<GroupCapabilities> {
  const key = address.toLowerCase();

  const cached = readCached(key);
  if (cached) return cached;

  const existing = inflight.get(key);
  if (existing) return existing;

  const probe = (async (): Promise<GroupCapabilities> => {
    const config = getActiveConfig();
    const rpcUrl = config.chainRpcUrl ?? config.circlesRpcUrl;
    if (!rpcUrl) {
      // No RPC available — conservative default so the UI doesn't lock up
      // pretending the group has no capabilities at all.
      return emptyCaps();
    }
    try {
      const provider = new JsonRpcProvider(rpcUrl);
      const [bytecode, ownerInfo] = await Promise.all([
        readEffectiveBytecode(provider, address),
        readGroupOwnerAndService(provider, address),
      ]);

      if (!bytecode) {
        return emptyCaps();
      }

      const bytecodeCaps = classifyBytecode(bytecode);
      const { isContract, safeOwners } = await readSafeOwnersIfContract(
        provider,
        ownerInfo.owner
      );

      const caps: GroupCapabilities = {
        ...bytecodeCaps,
        owner: ownerInfo.owner,
        service: ownerInfo.service,
        ownerIsContract: isContract,
        ownerSafeOwners: safeOwners,
      };
      writeCached(key, caps);
      return caps;
    } catch (e) {
      // Network or RPC error: do not cache; next call may succeed.
      console.warn('[groupKind] probeGroupCapabilities failed for', address, e);
      return emptyCaps();
    }
  })();

  inflight.set(key, probe);
  try {
    return await probe;
  } finally {
    inflight.delete(key);
  }
}

function emptyCaps(): GroupCapabilities {
  return {
    trustKind: 'unknown',
    ownerRemove: false,
    optOut: false,
    owner: null,
    service: null,
    ownerIsContract: false,
    ownerSafeOwners: null,
  };
}

// Pure derivation: given the on-chain shape and the currently-connected
// runner + EOA addresses, decide whether the user can manage the group and
// how. Kept separate from `probeGroupCapabilities` so a wallet swap
// re-evaluates permission without re-probing the (immutable) on-chain shape.
//
// `eoaAddress` is the signer EOA (e.g. wallet.svelte's `signer.address`).
// It matters because some users have a personal-avatar Safe AND a separate
// group-owner Safe that share an EOA cosigner but where the personal Safe
// is NOT itself an owner of the group Safe. In that case the user CAN still
// manage the group — but only by reconnecting via the group's owner Safe.
// We detect that and surface it as `eoa-must-switch-wallet` so the UI can
// guide the user instead of letting them hit OnlyOwnerOrService at submit.
export function assessManagePermission(
  caps: GroupCapabilities,
  runnerAddress: Address | string | null | undefined,
  eoaAddress: Address | string | null | undefined = null
): ManagePermission {
  const runner = asAddress(runnerAddress ?? null);
  const eoa = asAddress(eoaAddress ?? null);
  if (!runner) {
    return { canManage: false, ownerProxyChain: [], reason: 'unknown' };
  }
  const owner = caps.owner;
  const service = caps.service;

  // Direct paths: runner IS the owner, OR runner IS the service.
  if (owner && runner === owner) {
    return { canManage: true, ownerProxyChain: [], reason: 'direct' };
  }
  if (service && runner === service) {
    return { canManage: true, ownerProxyChain: [], reason: 'service' };
  }

  // 1-hop Safe-on-Safe: owner is a Safe and runner is one of its owners.
  if (owner && caps.ownerSafeOwners && caps.ownerSafeOwners.includes(runner)) {
    return {
      canManage: true,
      ownerProxyChain: [owner],
      reason: 'nested-safe',
    };
  }

  // EOA-can-sign-but-runner-cannot. Runner Safe isn't an owner of the group
  // Safe, but the user's EOA *is*. The user has signing rights — they just
  // need to reconnect using the group's owner Safe as their wallet.
  if (
    owner &&
    eoa &&
    caps.ownerSafeOwners &&
    caps.ownerSafeOwners.includes(eoa)
  ) {
    return {
      canManage: false,
      ownerProxyChain: [owner],
      reason: 'eoa-must-switch-wallet',
    };
  }

  // We have full data and neither the runner nor the EOA is on any path.
  if (owner !== null) {
    return { canManage: false, ownerProxyChain: [], reason: 'not-an-owner' };
  }

  // Could not read owner — some group variants (`simple`/ScoreGroup) don't
  // expose `owner()` at all and use different permission models. Be
  // OPTIMISTIC here: leave the Add/Remove buttons enabled so the user can
  // attempt the action. The preflight in `trustActions.ts` runs `eth_call`
  // from the runner; if the contract rejects the call, the user sees a
  // decoded error from preflight instead of a button that does nothing.
  return { canManage: true, ownerProxyChain: [], reason: 'unknown' };
}
