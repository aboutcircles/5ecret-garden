import { get } from 'svelte/store';
import type { Avatar, Sdk } from '@aboutcircles/sdk';
import { avatarState } from '$lib/shared/state/avatar.svelte';
import { circles } from '$lib/shared/state/circles';
import { initTransactionHistoryStore, refreshTransactionHistory } from '$lib/shared/state/transactionHistory';
import { initContactStore, refreshContactStore } from '$lib/shared/state/contacts';
import { initBalanceStore, refreshBalanceStore } from '$lib/shared/state/circlesBalances';
import { initGroupMetricsStore } from '$lib/areas/groups/state';

const MIN_RESYNC_INTERVAL_MS = 5_000;
const LIVENESS_CHECK_INTERVAL_MS = 15_000;

let lastResyncAt = 0;

/**
 * Initialises the event-driven stores for a freshly-loaded avatar (first call).
 * Uses the dedup-guarded `init*` functions so a cold mount doesn't double-subscribe.
 */
export function initAvatarStores(avatar: Avatar): void {
  void initTransactionHistoryStore(avatar);
  initContactStore(avatar);
  initBalanceStore(avatar);
  if (avatarState.isGroup) {
    const sdk = get(circles);
    if (sdk) {
      void initGroupMetricsStore(sdk.rpc, avatar.address);
    }
  }
}

/**
 * Refreshes stores after a WS reconnect/liveness tick, bypassing the dedup guards so
 * that stale data is reloaded even though the avatar address hasn't changed.
 *
 * Transaction history and balances always refresh *quietly* — they re-subscribe and
 * refetch page 1 in place without blanking to a skeleton, and no-op when nothing
 * changed. This is what stops the periodic 15s liveness tick from flickering the UI.
 *
 * Contacts also rebind on every tick: re-init is non-destructive (the contact store
 * keeps its current value until the new query resolves), so it doesn't flicker, and
 * rebinding keeps live trust updates attached to the fresh event observable after an
 * interval-detected reconnect.
 *
 * Group metrics can blank on re-init, so they only refresh on a `full` resync (tab
 * refocus / network back online), not on the steady-state liveness interval.
 */
function refreshAvatarStores(avatar: Avatar, opts?: { full?: boolean }): void {
  void refreshTransactionHistory({ quiet: true });
  refreshBalanceStore(avatar, { quiet: true });
  refreshContactStore(avatar);
  if (opts?.full && avatarState.isGroup) {
    const sdk = get(circles);
    if (sdk) {
      void initGroupMetricsStore(sdk.rpc, avatar.address);
    }
  }
}

/**
 * `CirclesRpc.websocketConnected` is private in the SDK's types and there is no
 * public connection-state or reconnect hook, so we read it defensively. Returns
 * undefined if the field is absent (e.g. SDK internals changed).
 */
export function isWebsocketConnected(sdk: Sdk | undefined): boolean | undefined {
  const flag = ((sdk as any)?.rpc?.client as unknown as { websocketConnected?: unknown })
    ?.websocketConnected;
  return typeof flag === 'boolean' ? flag : undefined;
}

/**
 * Re-establishes the realtime event subscription. The SDK reconnects a dropped
 * websocket but never re-issues `eth_subscribe`, and it ignores clean closes
 * entirely — so after any disconnect `avatar.events` is silent for the rest of
 * the session. `subscribeToEvents()` creates a fresh observable via a fresh
 * `eth_subscribe` (reconnecting the socket first if needed), then we rebind the
 * stores to it and reload to catch up on anything missed while disconnected.
 */
async function resync(opts?: { full?: boolean }): Promise<void> {
  const avatar = avatarState.avatar;
  if (!avatar) return;

  const now = Date.now();
  if (now - lastResyncAt < MIN_RESYNC_INTERVAL_MS) return;
  lastResyncAt = now;

  try {
    await avatar.subscribeToEvents();
  } catch (e) {
    // Don't let a subscribe failure block the store rebind below — a stale
    // observable is still better than empty stores.
    console.warn('[realtimeSync] subscribeToEvents failed', e);
  }
  try {
    refreshAvatarStores(avatar, opts);
  } catch (e) {
    console.warn('[realtimeSync] refreshAvatarStores failed', e);
  }
}

/**
 * Wires up resilience for the realtime websocket subscription using the signals
 * we can observe from the app: the tab becoming visible again, the network
 * coming back online, and a disconnect-gated liveness check. Returns a cleanup
 * function. No-op (returns a no-op cleanup) outside the browser.
 */
export function initRealtimeSync(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return () => {};
  }

  // Start each subscription session unthrottled.
  lastResyncAt = 0;

  // Tab refocus / network back online: do a FULL resync (also rebinds contacts +
  // group metrics) since the user has just returned and a complete catch-up is wanted.
  const onVisible = () => {
    if (document.visibilityState === 'visible') void resync({ full: true });
  };
  const onOnline = () => void resync({ full: true });

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);

  // Safety net for a clean idle-close while the tab is foregrounded: only
  // resyncs when the socket actually reports disconnected, so it doesn't leak
  // subscriptions or reload on every tick. This is a QUIET resync — transaction
  // history and balances refetch in place without blanking, and no-op when nothing
  // changed — so it never flickers the UI even though it can fire every interval.
  const interval = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    // Fail safe: resync when the socket reports disconnected OR when the connection
    // state is unknown (the SDK field is private/undocumented and may return undefined
    // after an SDK change). `!== true` means an SDK shape change degrades to a harmless
    // quiet resync rather than silently freezing the only background refresh path.
    if (isWebsocketConnected(get(circles)) !== true) void resync();
  }, LIVENESS_CHECK_INTERVAL_MS);

  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
    clearInterval(interval);
  };
}
