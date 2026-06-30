import type { CirclesConfig } from '$lib/shared/config/circles';
import { gnosisConfig, chiadoConfig } from '$lib/shared/config/circles';
import type { NetworkType } from '$lib/shared/integrations/chain/chainConfig';

/**
 * Storage key for persisting network settings
 */
const SETTINGS_STORAGE_KEY = 'circles.network.settings';

/**
 * Which backend deployment to talk to. Both index the same Gnosis mainnet — only the data
 * host (indexer RPC + its co-hosted endpoints, and the realtime websocket derived from it)
 * changes, never the chain, contracts or addresses. `staging` points at the staging
 * deployment; useful for validating server-side changes (e.g. realtime push) before they
 * reach production.
 */
export type ServerEnv = 'production' | 'staging';

/** Production indexer RPC host (the default data backend). */
const PROD_RPC_HOST = 'https://rpc.aboutcircles.com';
/** Staging indexer RPC host — same Gnosis mainnet, separate deployment. */
const STAGING_RPC_HOST = 'https://rpc.staging.aboutcircles.com';

/**
 * Network settings interface
 */
export interface NetworkSettings {
  /** Use rings contract addresses (experimental) */
  ring: boolean;
  /** Network to connect to */
  network: NetworkType;
  /** Backend deployment to talk to (gnosis only). Defaults to production. */
  server?: ServerEnv;
  /** Custom Circles RPC URL override */
  customCirclesRpcUrl?: string;
  /** Custom Chain RPC URL override */
  customChainRpcUrl?: string;
  /** Custom Profile Service URL override */
  customProfileServiceUrl?: string;
  /** Custom Pathfinder URL override */
  customPathfinderUrl?: string;
  /** Use legacy EOA mode (no Safe) */
  legacy?: boolean;
  /**
   * Show advanced / power-user features (extra Settings tabs, raw profile CID,
   * product IPFS/CID/SKU, …). When false (the default) the app runs in a
   * simplified "standard" view that hides these. Toggled via the "beta" label.
   */
  advancedMode?: boolean;
}

/**
 * Default settings
 */
const defaultSettings: NetworkSettings = {
  ring: false,
  network: 'gnosis',
  // Default to the simplified standard view; power users opt in via the "beta" label.
  advancedMode: false,
};

/**
 * Load settings from localStorage
 */
function loadSettings(): NetworkSettings {
  if (typeof localStorage === 'undefined') {
    return defaultSettings;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load network settings:', e);
  }

  return defaultSettings;
}

/**
 * Save settings to localStorage
 */
function saveSettings(newSettings: NetworkSettings): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
  } catch (e) {
    console.warn('Failed to save network settings:', e);
  }
}

/**
 * Reactive settings store
 */
export const settings = $state<NetworkSettings>(loadSettings());

/**
 * Update settings and persist to localStorage
 */
export function updateSettings(updates: Partial<NetworkSettings>): void {
  Object.assign(settings, updates);
  saveSettings(settings);
}

/**
 * Toggle the advanced / standard UI mode. Exposed as a shared helper so the "beta"
 * label in the desktop sidebar and the mobile header drive the exact same write path.
 */
export function toggleAdvancedMode(): void {
  updateSettings({ advancedMode: !settings.advancedMode });
}

/**
 * Get the active CirclesConfig based on current settings
 * Merges default config with any custom URL overrides
 */
export function getActiveConfig(): CirclesConfig {
  // Get base config based on network and ring settings
  const baseConfigs = settings.network === 'chiado' ? chiadoConfig : gnosisConfig;
  const baseConfig = settings.ring ? baseConfigs.rings : baseConfigs.production;

  const config: CirclesConfig = { ...baseConfig };

  // Staging server: repoint the indexer RPC — and the endpoints co-hosted on it — at the
  // staging deployment. The SDK derives the realtime websocket URL from `circlesRpcUrl`, so
  // this also moves live events to staging. Only the data host changes; chain, contracts and
  // addresses stay identical (staging indexes the same Gnosis mainnet), so this applies to the
  // gnosis network only. Explicit custom* overrides below still win over this rewrite.
  if (settings.server === 'staging' && settings.network === 'gnosis') {
    const toStaging = (url: string | undefined): string | undefined =>
      url?.startsWith(PROD_RPC_HOST)
        ? STAGING_RPC_HOST + url.slice(PROD_RPC_HOST.length)
        : url;
    config.circlesRpcUrl = toStaging(config.circlesRpcUrl) ?? config.circlesRpcUrl;
    config.chainRpcUrl = toStaging(config.chainRpcUrl) ?? config.chainRpcUrl;
    config.profileServiceUrl = toStaging(config.profileServiceUrl) ?? config.profileServiceUrl;
    config.profilePinningServiceUrl = toStaging(config.profilePinningServiceUrl);
    config.scoreGroupsBackendUrl = toStaging(config.scoreGroupsBackendUrl);
  }

  // Apply any custom URL overrides (highest precedence)
  if (settings.customCirclesRpcUrl) {
    config.circlesRpcUrl = settings.customCirclesRpcUrl;
  }

  if (settings.customChainRpcUrl) {
    config.chainRpcUrl = settings.customChainRpcUrl;
  }

  if (settings.customProfileServiceUrl) {
    config.profileServiceUrl = settings.customProfileServiceUrl;
  }

  if (settings.customPathfinderUrl) {
    config.pathfinderUrl = settings.customPathfinderUrl;
  }

  return config;
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): void {
  // advancedMode is a per-device UI preference, not network config — preserve it across a
  // network-settings reset so clearing RPC overrides doesn't silently flip the UI mode.
  const { advancedMode } = settings;
  Object.assign(settings, defaultSettings, { advancedMode });
  saveSettings(settings);
}
