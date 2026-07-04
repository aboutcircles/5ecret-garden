// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { rememberRedirect, takeRedirect } from '$lib/shared/utils/redirectIntent';

/**
 * Deep-linking to a gated route (e.g. /market) while signed out must return the
 * user there after sign-in, not strand them on /dashboard. rememberRedirect stashes
 * the destination before the wallet guard bounces to the landing page; takeRedirect
 * consumes it once after connect. Also guards against open redirects.
 */
describe('redirectIntent', () => {
  afterEach(() => sessionStorage.clear());

  it('round-trips the intended path (with query string)', () => {
    rememberRedirect('/market?seller=0xabc');
    expect(takeRedirect()).toBe('/market?seller=0xabc');
  });

  it('is one-shot: a second take returns the fallback', () => {
    rememberRedirect('/market');
    expect(takeRedirect()).toBe('/market');
    expect(takeRedirect()).toBe('/dashboard');
  });

  it('returns the fallback when nothing is stored', () => {
    expect(takeRedirect()).toBe('/dashboard');
    expect(takeRedirect('/somewhere')).toBe('/somewhere');
  });

  it('never returns to the landing page or the connect flow', () => {
    rememberRedirect('/');
    expect(takeRedirect()).toBe('/dashboard');
    rememberRedirect('/connect-wallet/connect-safe');
    expect(takeRedirect()).toBe('/dashboard');
  });

  it('rejects off-origin paths (no open redirect)', () => {
    for (const evil of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)']) {
      sessionStorage.clear();
      rememberRedirect(evil);
      expect(takeRedirect()).toBe('/dashboard');
    }
  });

  it('rejects an unsafe value even if it was injected into storage directly', () => {
    sessionStorage.setItem('Circles.RedirectAfterAuth', '//evil.com');
    expect(takeRedirect()).toBe('/dashboard');
  });
});
