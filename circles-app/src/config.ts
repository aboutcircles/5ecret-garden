import { http, createConfig } from '@wagmi/core';
import { gnosis } from '@wagmi/core/chains';
import { injected } from '@wagmi/connectors';
import { gnosisConfig } from '$lib/shared/config/circles';

// Single source of truth: all chain RPC URLs come from circles.ts
const chainRpcUrl = gnosisConfig.production.chainRpcUrl ?? gnosisConfig.production.circlesRpcUrl;

export const config = createConfig({
  chains: [gnosis],
  // Only the generic injected connector is configured explicitly. Real wallets
  // (MetaMask, Rabby, …) are surfaced via wagmi's default EIP-6963 discovery, and
  // Safe accounts use the native SafeBrowserRunner flow (the wagmi `safe()` connector
  // is deliberately not used — see wallet.svelte.ts). `coinbaseWallet()` was dropped:
  // its SDK rendered an option unconditionally even without the extension, and
  // Coinbase Smart Wallet doesn't support Gnosis (chainId 100).
  connectors: [
    injected(),
  ],
  transports: {
    [gnosis.id]: http(chainRpcUrl),
  },
});
