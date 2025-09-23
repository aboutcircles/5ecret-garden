import { http, createConfig } from '@wagmi/core';
import { gnosis } from '@wagmi/core/chains';

export const config = createConfig({
    chains: [gnosis],
    transports: {
        [gnosis.id]: http(),
    },
})