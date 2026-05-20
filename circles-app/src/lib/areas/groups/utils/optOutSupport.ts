import { JsonRpcProvider } from 'ethers';
import { getActiveConfig } from '$lib/shared/state/settings.svelte';

// Function selector for ScoreGroup.optOut() (no args).
// keccak256("optOut()")[0:4]
const OPT_OUT_SELECTOR = 'd4eec5a6';

const CACHE_KEY_PREFIX = 'circles.optOutSupport.';

// In-memory cache to dedupe concurrent probes for the same address.
const inflight = new Map<string, Promise<boolean>>();

function cacheKey(address: string): string {
  return `${CACHE_KEY_PREFIX}${address.toLowerCase()}`;
}

function readCached(address: string): boolean | null {
  if (typeof localStorage === 'undefined') return null;
  const v = localStorage.getItem(cacheKey(address));
  if (v === '1') return true;
  if (v === '0') return false;
  return null;
}

function writeCached(address: string, supported: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(cacheKey(address), supported ? '1' : '0');
  } catch {
    // localStorage quota / privacy mode — ignore, probe will repeat next session.
  }
}

// Probe whether the contract at `address` exposes `optOut()` (selector 0xd4eec5a6).
// Resolves to `false` on any RPC failure so callers default to hiding the action.
export async function probeOptOutSupport(address: string): Promise<boolean> {
  const cached = readCached(address);
  if (cached !== null) return cached;

  const key = address.toLowerCase();
  const existing = inflight.get(key);
  if (existing) return existing;

  const probe = (async () => {
    const config = getActiveConfig();
    const rpcUrl = config.chainRpcUrl ?? config.circlesRpcUrl;
    if (!rpcUrl) return false;

    try {
      const provider = new JsonRpcProvider(rpcUrl);
      const code = await provider.getCode(address);
      if (!code || code === '0x') return false;
      const supported = code.toLowerCase().includes(OPT_OUT_SELECTOR);
      writeCached(address, supported);
      return supported;
    } catch {
      // Network or RPC error: do not cache. Next call may succeed.
      return false;
    }
  })();

  inflight.set(key, probe);
  try {
    return await probe;
  } finally {
    inflight.delete(key);
  }
}
