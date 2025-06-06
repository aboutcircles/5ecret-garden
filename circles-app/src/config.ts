import { http, createConfig } from '@wagmi/core';
import { gnosis } from '@wagmi/core/chains';
import { injected } from '@wagmi/connectors';

export const config = createConfig({
    chains: [gnosis],
    transports: {
        [gnosis.id]: http(),
    },
})