import { get } from 'svelte/store';
import type { Avatar } from '@aboutcircles/sdk';
import { avatarState } from '$lib/shared/state/avatar.svelte';
import { circles } from '$lib/shared/state/circles';
import { initTransactionHistoryStore, refreshTransactionHistory } from '$lib/shared/state/transactionHistory';
import { initContactStore, refreshContactStore } from '$lib/shared/state/contacts';
import { initBalanceStore, refreshBalanceStore } from '$lib/shared/state/circlesBalances';
import { initGatewaySpendingStore } from '$lib/shared/state/gatewaySpending.svelte';
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
  // Marketplace/gateway spend is infrequent and not realtime-critical, so it loads once per
  // avatar (dedup-guarded) and is NOT part of the steady-state liveness refresh — that keeps
  // the spending card from blanking every tick.
  initGatewaySpendingStore(avatar);
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
 * Whether the realtime events websocket is currently connected.
 *
 * CRITICAL: realtime events flow on the AVATAR's rpc client — the one `subscribeToEvents()`
 * opens — which (confirmed by live instrumentation) is a DIFFERENT SDK instance than the one
 * held in the `circles` store. The store's client never opens a socket (it's only used for
 * stateless HTTP calls), so reading IT reports "disconnected" forever. That mismatch is what
 * made the status indicator show a permanent red dot and made the liveness gate below poll
 * every 15s even though realtime push was working fine. So read the avatar's client.
 *
 * `websocketConnected` is private in the SDK's types and there's no public connection-state
 * accessor, so we read it defensively; returns undefined when unavailable (no avatar yet, or
 * SDK internals changed). TODO: the two coexisting SDK instances are a separate smell worth
 * unifying upstream — once there's one SDK, this can read it directly.
 */
export function isWebsocketConnected(): boolean | undefined {
  const flag = (
    avatarState.avatar as unknown as { rpc?: { client?: { websocketConnected?: unknown } } }
  )?.rpc?.client?.websocketConnected;
  return typeof flag === 'boolean' ? flag : undefined;
}

/**
 * Re-establishes the realtime event subscription after a genuine drop, then refetches to
 * catch up on anything missed. Only meaningful when the avatar's websocket is actually down
 * (see the gate in `initRealtimeSync`); on a healthy socket this is not called.
 *
 * `avatar.subscribeToEvents()` is idempotent in the SDK (a private `_hasSubscribed` flag set
 * once by `Sdk.getAvatar()`), so a plain call would no-op even after the socket dropped and
 * never re-open it. When the socket is down we clear that flag so the call genuinely
 * re-subscribes (`rpc.client.subscribe()` reconnects when `!websocketConnected`) and rebinds
 * a fresh `avatar.events` observable. TODO: fix the idempotency upstream and drop the reset.
 */
async function resync(opts?: { full?: boolean }): Promise<void> {
  const avatar = avatarState.avatar;
  if (!avatar) return;

  const now = Date.now();
  if (now - lastResyncAt < MIN_RESYNC_INTERVAL_MS) return;
  lastResyncAt = now;

  try {
    if (isWebsocketConnected() !== true) {
      (avatar as unknown as { _hasSubscribed?: boolean })._hasSubscribed = false;
    }
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

  // Backstop refresh while the tab is foregrounded. Runs every tick REGARDLESS of socket
  // state: a "connected" websocket does NOT guarantee events are actually being delivered —
  // the server's realtime push can be silently broken (e.g. the events producer notifying on
  // a channel the push endpoint doesn't listen on) while the socket itself stays open. So
  // connection state can't be used as a proxy for "events are flowing" to gate this poll;
  // gating it that way froze background refresh whenever the socket looked healthy but was
  // silent. This is a QUIET resync — transaction history and balances refetch in place without
  // blanking, and no-op when nothing changed — so it never flickers the UI even firing every
  // interval, and when the socket is genuinely down resync() also re-subscribes. When push
  // works this is cheap redundant insurance; when it silently fails it's the only thing
  // keeping the dashboard fresh.
  const interval = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    void resync();
  }, LIVENESS_CHECK_INTERVAL_MS);

  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
    clearInterval(interval);
  };
}
