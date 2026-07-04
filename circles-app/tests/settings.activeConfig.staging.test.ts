import { afterEach, describe, expect, it } from 'vitest';
import {
  getActiveConfig,
  updateSettings,
} from '$lib/shared/state/settings.svelte';

/**
 * The Production/Staging server toggle must repoint every data-plane endpoint —
 * not just the indexer RPC. Regression guard for the market-api, which lives on
 * its own host (market-api.aboutcircles.com) and was previously never rewritten,
 * leaving the staging app talking to the production market-api.
 */
describe('getActiveConfig() staging server rewrite', () => {
  afterEach(() => {
    // Reset the shared settings singleton between cases (resetSettings() keeps an
    // existing `server` key, so clear it explicitly).
    updateSettings({ server: undefined, network: 'gnosis', ring: false });
  });

  it('defaults to the production endpoints', () => {
    const cfg = getActiveConfig();
    expect(cfg.marketApiBase).toBe('https://market-api.aboutcircles.com/');
    expect(cfg.profilePinningServiceUrl).toBe('https://rpc.aboutcircles.com/profiles');
  });

  it('repoints the market-api at its staging host when server=staging', () => {
    updateSettings({ server: 'staging' });
    const cfg = getActiveConfig();
    expect(cfg.marketApiBase).toBe('https://market-api.staging.aboutcircles.com/');
  });

  it('also repoints the co-hosted rpc/pinning endpoints', () => {
    updateSettings({ server: 'staging' });
    const cfg = getActiveConfig();
    expect(cfg.profilePinningServiceUrl).toBe('https://rpc.staging.aboutcircles.com/profiles');
    expect(cfg.circlesRpcUrl?.startsWith('https://rpc.staging.aboutcircles.com')).toBe(true);
  });

  it('leaves off-map endpoints (IPFS gateway) untouched', () => {
    const prod = getActiveConfig().ipfsGatewayBase;
    updateSettings({ server: 'staging' });
    expect(getActiveConfig().ipfsGatewayBase).toBe(prod);
  });

  it('does not rewrite when the network is not gnosis', () => {
    updateSettings({ server: 'staging', network: 'chiado' });
    // chiado has no staging deployment; the gnosis-only guard must leave it alone.
    expect(getActiveConfig().marketApiBase).toBe('https://market-api.aboutcircles.com/');
  });
});
