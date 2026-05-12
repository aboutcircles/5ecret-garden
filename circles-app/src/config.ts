import { http, createConfig } from '@wagmi/core';
import { gnosis } from '@wagmi/core/chains';
import { injected, coinbaseWallet, safe } from '@wagmi/connectors';
import { gnosisConfig } from '$lib/shared/config/circles';

// Single source of truth: all chain RPC URLs come from circles.ts
const chainRpcUrl = gnosisConfig.production.chainRpcUrl ?? gnosisConfig.production.circlesRpcUrl;

export const config = createConfig({
  chains: [gnosis],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Circles' }),
    safe(),
  ],
  transports: {
    [gnosis.id]: http(chainRpcUrl),
  },
});
