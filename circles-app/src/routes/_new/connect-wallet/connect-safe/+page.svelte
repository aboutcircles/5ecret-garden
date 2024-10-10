<script lang="ts">
    import {onMount} from 'svelte';
    import {type CirclesConfig, Sdk} from '@circles-sdk/sdk';
    import {circles} from '$lib/stores/circles';
    import {BrowserProviderContractRunner} from '@circles-sdk/adapter-ethers';
    import {chiadoConfig, gnosisConfig} from '$lib/chiadoConfig';
    import {wallet} from "$lib/stores/wallet";
    import {goto} from "$app/navigation";

    export async function getCirclesConfig(chainId: bigint): Promise<CirclesConfig> {
        switch (chainId) {
            case 100n:
                return gnosisConfig;
            case 10200n:
                return chiadoConfig;
            default:
                throw new Error(`Unsupported chain-id: ${chainId}`);
        }
    }

    let circlesConfig: CirclesConfig | undefined = undefined

    onMount(async () => {
        const wallet = new BrowserProviderContractRunner();
        await wallet.init();

        $wallet = wallet;

        const network = await $wallet.provider?.getNetwork();
        if (!network) {
            throw new Error('Failed to get network');
        }
        circlesConfig = await getCirclesConfig(network.chainId);

        // Initialize the Circles SDK and set it as $circles to make it globally available.
        $circles = new Sdk(circlesConfig, $wallet!);

        await goto('/_new/connect-wallet/select-safe');
    });
</script>

<div class="hero bg-base-200 min-h-screen">
    <div class="hero-content flex-col lg:flex-row-reverse">
        <div class="card bg-base-100 w-96 shadow-xl">
            <figure class="px-10 pt-10">
                <span class="loading loading-spinner loading-lg"></span>
            </figure>
            <div class="card-body items-center text-center">
                <h2 class="card-title">Connecting your MetaMask wallet ...</h2>
                <p>Please wait while we're loading your wallet</p>
                <a href="/_new/connect-wallet" class="btn btn-warning">Cancel</a>
            </div>
        </div>
    </div>
</div>