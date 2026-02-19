import { http, createConfig } from '@wagmi/core';
import { gnosis } from '@wagmi/core/chains';
import { injected, coinbaseWallet, safe } from '@wagmi/connectors';

export const config = createConfig({
  chains: [gnosis],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Circles' }),
    safe(),
  ],
  transports: {
    [gnosis.id]: http(),
  },
});
