import { http, createConfig } from '@wagmi/core';
import { gnosis } from '@wagmi/core/chains';
import { injected, walletConnect, coinbaseWallet, safe } from '@wagmi/connectors';

export const config = createConfig({
  chains: [gnosis],
  connectors: [
    injected(),
    walletConnect({
      projectId: 'circles-wallet', // placeholder - WalletConnect won't work without real ID
    }),
    coinbaseWallet({ appName: 'Circles' }),
    safe(),
  ],
  transports: {
    [gnosis.id]: http(),
  },
});
