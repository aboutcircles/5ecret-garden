import { get } from 'svelte/store';
import type { Avatar, Sdk } from '@aboutcircles/sdk';
import { avatarState } from '$lib/shared/state/avatar.svelte';
import { circles } from '$lib/shared/state/circles';
import { initTransactionHistoryStore } from '$lib/shared/state/transactionHistory';
import { initContactStore } from '$lib/shared/state/contacts';
import { initBalanceStore } from '$lib/shared/state/circlesBalances';
import { initGroupMetricsStore } from '$lib/areas/groups/state';

const MIN_RESYNC_INTERVAL_MS = 5_000;
const LIVENESS_CHECK_INTERVAL_MS = 15_000;

let lastResyncAt = 0;

/**
 * (Re)binds the event-driven stores to the avatar's current `events` observable
 * and triggers their initial load. Each `init*` call tears down its previous
 * subscription and recreates the store, so this is safe to call repeatedly.
 */
export function initAvatarStores(avatar: Avatar): void {
  initTransactionHistoryStore(avatar);
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
 * `CirclesRpc.websocketConnected` is private in the SDK's types and there is no
 * public connection-state or reconnect hook, so we read it defensively. Returns
 * undefined if the field is absent (e.g. SDK internals changed).
 */
function isWebsocketConnected(sdk: Sdk | undefined): boolean | undefined {
  const flag = (sdk?.circlesRpc as unknown as { websocketConnected?: unknown })
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
async function resync(): Promise<void> {
  const avatar = avatarState.avatar;
  if (!avatar) return;

  const now = Date.now();
  if (now - lastResyncAt < MIN_RESYNC_INTERVAL_MS) return;
  lastResyncAt = now;

  try {
    await avatar.subscribeToEvents();
    initAvatarStores(avatar);
  } catch (e) {
    console.debug('[realtimeSync] resync failed', e);
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

  const onVisible = () => {
    if (document.visibilityState === 'visible') void resync();
  };
  const onOnline = () => void resync();

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);

  // Safety net for a clean idle-close while the tab is foregrounded: only
  // resyncs when the socket actually reports disconnected, so it doesn't leak
  // subscriptions or reload on every tick.
  const interval = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (isWebsocketConnected(get(circles)) === false) void resync();
  }, LIVENESS_CHECK_INTERVAL_MS);

  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
    clearInterval(interval);
  };
}
