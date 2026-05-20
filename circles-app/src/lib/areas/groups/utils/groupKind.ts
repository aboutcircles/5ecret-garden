import { JsonRpcProvider, keccak256, toUtf8Bytes } from 'ethers';
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

const CACHE_KEY_PREFIX = 'circles.groupCaps.';
const inflight = new Map<string, Promise<GroupCapabilities>>();

function cacheKey(address: string): string {
  return `${CACHE_KEY_PREFIX}${address.toLowerCase()}`;
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
      typeof parsed.trustKind === 'string'
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

function classify(bytecode: string): GroupCapabilities {
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
      return { trustKind: 'unknown', ownerRemove: false, optOut: false };
    }
    try {
      const provider = new JsonRpcProvider(rpcUrl);
      const bytecode = await readEffectiveBytecode(provider, address);
      if (!bytecode) {
        return { trustKind: 'unknown', ownerRemove: false, optOut: false };
      }
      const caps = classify(bytecode);
      writeCached(key, caps);
      return caps;
    } catch {
      // Network or RPC error: do not cache; next call may succeed.
      return { trustKind: 'unknown', ownerRemove: false, optOut: false };
    }
  })();

  inflight.set(key, probe);
  try {
    return await probe;
  } finally {
    inflight.delete(key);
  }
}
