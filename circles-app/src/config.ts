import { http, createConfig } from '@wagmi/core';
import { gnosis } from '@wagmi/core/chains';
import { injected, walletConnect } from '@wagmi/connectors';

export const config = createConfig({
    chains: [gnosis],
    transports: {
        [gnosis.id]: http(),
    },
    connectors: [
        injected(),
        walletConnect({
            projectId: 'aeb9893f1c735720bcacaf6796bb541e',
        })
    ],
})