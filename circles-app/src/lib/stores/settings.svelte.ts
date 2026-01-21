import type { CirclesConfig } from '@aboutcircles/sdk-types';
import { gnosisConfig, chiadoConfig } from '$lib/circlesConfig';
import type { NetworkType } from '$lib/utils/chainConfig';

/**
 * Storage key for persisting network settings
 */
const SETTINGS_STORAGE_KEY = 'circles.network.settings';

/**
 * Network settings interface
 */
export interface NetworkSettings {
  /** Use rings contract addresses (experimental) */
  ring: boolean;
  /** Network to connect to */
  network: NetworkType;
  /** Custom Circles RPC URL override */
  customCirclesRpcUrl?: string;
  /** Custom Chain RPC URL override */
  customChainRpcUrl?: string;
  /** Custom Profile Service URL override */
  customProfileServiceUrl?: string;
  /** Custom Pathfinder URL override */
  customPathfinderUrl?: string;
}

/**
 * Default settings
 */
const defaultSettings: NetworkSettings = {
  ring: false,
  network: 'gnosis',
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
 * Get the active CirclesConfig based on current settings
 * Merges default config with any custom URL overrides
 */
export function getActiveConfig(): CirclesConfig {
  // Get base config based on network and ring settings
  const baseConfigs = settings.network === 'chiado' ? chiadoConfig : gnosisConfig;
  const baseConfig = settings.ring ? baseConfigs.rings : baseConfigs.production;

  // Apply any custom URL overrides
  const config: CirclesConfig = { ...baseConfig };

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
  Object.assign(settings, defaultSettings);
  saveSettings(settings);
}
