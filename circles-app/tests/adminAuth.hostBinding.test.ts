import { afterEach, describe, expect, it } from 'vitest';
import {
  setAdminToken,
  getAdminToken,
  clearAdminToken,
  selectValidAdminToken,
} from '$lib/areas/admin/services/gateway/adminAuth';
import { updateSettings } from '$lib/shared/state/settings.svelte';

/**
 * The admin JWT is minted against one market-api deployment's ADMIN_JWT_SECRET, so it
 * is rejected (401) by the other. Binding the in-memory token to its host means a
 * Production/Staging server-toggle flip withholds the stale token instead of firing a
 * cross-environment request that 401s and bounces the admin out of a half-loaded page.
 * Regression guard for the #273 repoint (admin base now follows the server toggle).
 */
describe('admin token is bound to the market-api host it was minted against', () => {
  afterEach(() => {
    clearAdminToken();
    updateSettings({ server: undefined, network: 'gnosis', ring: false });
  });

  it('selectValidAdminToken: returns the token only when the host matches', () => {
    const session = { token: 'jwt-prod', host: 'https://market-api.aboutcircles.com' };
    expect(selectValidAdminToken(session, 'https://market-api.aboutcircles.com')).toBe('jwt-prod');
    expect(selectValidAdminToken(session, 'https://market-api.staging.aboutcircles.com')).toBeNull();
    expect(selectValidAdminToken(null, 'https://market-api.aboutcircles.com')).toBeNull();
  });

  it('returns the token while the active host is unchanged', () => {
    updateSettings({ server: 'production' });
    setAdminToken('jwt-prod');
    expect(getAdminToken()).toBe('jwt-prod');
  });

  it('withholds the token once the server toggle moves the base to the other env', () => {
    // Mint against production, then flip to staging — the token must not be served.
    updateSettings({ server: 'production' });
    setAdminToken('jwt-prod');
    expect(getAdminToken()).toBe('jwt-prod');

    updateSettings({ server: 'staging' });
    expect(getAdminToken()).toBeNull();

    // And the stale session is dropped, so flipping back does not resurrect it.
    updateSettings({ server: 'production' });
    expect(getAdminToken()).toBeNull();
  });
});
