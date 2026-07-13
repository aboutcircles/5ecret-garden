/**
 * Regression test for the realtime re-subscribe gate.
 *
 * The 15s→30s liveness resync runs on every foregrounded tick. It must only force a genuine
 * websocket re-subscribe (which resets the SDK's `_hasSubscribed` idempotency flag) on a
 * POSITIVELY-observed drop. Previously the gate was `isWebsocketConnected() !== true`, which
 * treated an `undefined` ("unknown") reading as "down" and re-subscribed every tick — and since
 * each `subscribeToEvents()` permanently registers a new SDK subscription listener that is never
 * cleaned up, the per-event work grew without bound over a long session, freezing the tab. The
 * gate is now `=== false`.
 */

import { describe, it, expect } from 'vitest';
import { shouldForceResubscribe } from '$lib/shared/state/realtimeSync';

describe('shouldForceResubscribe (realtime re-subscribe gate)', () => {
  it('forces a re-subscribe on a positively-observed drop (false)', () => {
    expect(shouldForceResubscribe(false)).toBe(true);
  });

  it('does NOT force a re-subscribe on a healthy socket (true)', () => {
    expect(shouldForceResubscribe(true)).toBe(false);
  });

  it('does NOT force a re-subscribe on an unknown reading (undefined)', () => {
    // The exact regression: "unknown" must not be treated as "down".
    expect(shouldForceResubscribe(undefined)).toBe(false);
  });
});
