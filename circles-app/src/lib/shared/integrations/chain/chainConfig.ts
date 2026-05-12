/**
 * Chain configuration utilities
 * Provides typed chain configs for use with SDK runners
 * Eliminates the need for `gnosis as any` casts
 *
 * RPC URLs are sourced from circles.ts (single source of truth).
 */

import { gnosisConfig, chiadoConfig } from '$lib/shared/config/circles';

/**
 * Flexible chain configuration interface.
 * Compatible with viem's Chain type but doesn't require strict viem types.
 */
export interface ChainConfig {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: {
      http: readonly string[];
    };
  };
}

/**
 * Gnosis Chain (mainnet) configuration
 * RPC URL comes from gnosisConfig.production.chainRpcUrl
 */
export const gnosisChainConfig: ChainConfig = {
  id: 100,
  name: 'Gnosis',
  nativeCurrency: {
    name: 'xDAI',
    symbol: 'xDAI',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [gnosisConfig.production.chainRpcUrl ?? gnosisConfig.production.circlesRpcUrl],
    },
  },
};

/**
 * Chiado testnet configuration
 */
export const chiadoChainConfig: ChainConfig = {
  id: 10200,
  name: 'Chiado',
  nativeCurrency: {
    name: 'xDAI',
    symbol: 'xDAI',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [chiadoConfig.production.chainRpcUrl ?? chiadoConfig.production.circlesRpcUrl],
    },
  },
};

/**
 * Network type for configuration
 */
export type NetworkType = 'gnosis' | 'chiado';

/**
 * Get the chain configuration for a given network
 */
export function getChainConfig(network: NetworkType): ChainConfig {
  switch (network) {
    case 'gnosis':
      return gnosisChainConfig;
    case 'chiado':
      return chiadoChainConfig;
    default:
      return gnosisChainConfig;
  }
}

/**
 * Get chain ID from network type
 */
export function getChainId(network: NetworkType): number {
  return getChainConfig(network).id;
}
