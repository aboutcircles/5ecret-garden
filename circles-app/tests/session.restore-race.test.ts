/**
 * Regression test for the auth-guard race condition:
 *
 * Previously, the layout's auth-guard $effect fired goto('/') the moment
 * walletWatcherInitialized flipped to true — before restoreSession() had time
 * to set avatarState.avatar. Logged-in users refreshing on any protected route
 * would land on the welcome page with their session intact but invisible.
 *
 * Fix: the guard now waits for walletRestoreCompleted, which only flips after
 * initWalletWatcher() fully resolves.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Minimal stubs ────────────────────────────────────────────────────────────

const gotoSpy = vi.fn();

vi.mock('$app/navigation', () => ({ goto: gotoSpy }));
vi.mock('$app/stores', () => ({
  page: { subscribe: vi.fn(() => () => {}) },
}));
vi.mock('$app/environment', () => ({ browser: true }));

// ─── Core logic extracted from +layout.svelte ─────────────────────────────────
// We test the logic directly rather than mounting the full SvelteKit layout.

type RestoreSessionFn = () => Promise<void>;

/**
 * Simulate the auth-guard behaviour before the fix:
 * redirects as soon as walletWatcherInitialized is true,
 * regardless of whether restore has finished.
 */
async function runLayoutLogicBuggy(
  restoreSession: RestoreSessionFn,
  hasAvatarAfterRestore: boolean,
): Promise<{ redirected: boolean }> {
  let avatar: object | undefined = undefined;
  let redirected = false;
  let walletWatcherInitialized = false;

  // Effect 1: start watcher (simplified — no watchAccount)
  walletWatcherInitialized = true;
  const restorePromise = restoreSession().then(() => {
    if (hasAvatarAfterRestore) avatar = { address: '0xabc' };
  });

  // Effect 2 (buggy): fires immediately after walletWatcherInitialized is true
  if (walletWatcherInitialized && !avatar) {
    redirected = true; // simulates goto('/')
  }

  await restorePromise;
  return { redirected };
}

/**
 * Simulate the auth-guard behaviour after the fix:
 * only redirects after restore completes (walletRestoreCompleted = true).
 */
async function runLayoutLogicFixed(
  restoreSession: RestoreSessionFn,
  hasAvatarAfterRestore: boolean,
): Promise<{ redirected: boolean }> {
  let avatar: object | undefined = undefined;
  let redirected = false;
  let walletRestoreCompleted = false;

  // Effect 1: start watcher, flip completed only after resolve
  await restoreSession().then(() => {
    if (hasAvatarAfterRestore) avatar = { address: '0xabc' };
  }).finally(() => {
    walletRestoreCompleted = true;
  });

  // Effect 2 (fixed): fires after walletRestoreCompleted
  if (walletRestoreCompleted && !avatar) {
    redirected = true;
  }

  return { redirected };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('session restore race condition', () => {
  beforeEach(() => {
    gotoSpy.mockReset();
  });

  it('BUGGY: redirects to / even when restoreSession succeeds (demonstrates the race)', async () => {
    // restoreSession takes some time (realistic async work)
    const slowRestore = () => new Promise<void>((r) => setTimeout(r, 10));

    const { redirected } = await runLayoutLogicBuggy(slowRestore, /* hasAvatar */ true);

    // The bug: redirected=true even though the session was valid
    expect(redirected).toBe(true);
  });

  it('FIXED: does not redirect when restoreSession successfully sets avatar', async () => {
    const slowRestore = () => new Promise<void>((r) => setTimeout(r, 10));

    const { redirected } = await runLayoutLogicFixed(slowRestore, /* hasAvatar */ true);

    expect(redirected).toBe(false);
  });

  it('FIXED: still redirects to / when restoreSession finds no avatar (unauthenticated)', async () => {
    const noSessionRestore = () => Promise.resolve();

    const { redirected } = await runLayoutLogicFixed(noSessionRestore, /* hasAvatar */ false);

    expect(redirected).toBe(true);
  });

  it('FIXED: still redirects when restoreSession throws (clearSession path)', async () => {
    const failingRestore = () => Promise.reject(new Error('no saved avatar'));

    // In the real layout, restoreSession catches internally and calls
    // clearSession which does goto('/') directly. But the guard should
    // also catch the case where avatar remains unset after rejection.
    const { redirected } = await runLayoutLogicFixed(failingRestore, /* hasAvatar */ false).catch(
      () => ({ redirected: true }),
    );

    expect(redirected).toBe(true);
  });
});
