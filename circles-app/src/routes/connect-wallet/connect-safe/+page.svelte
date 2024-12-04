<script lang="ts">
    import {onMount} from 'svelte';
    import {type CirclesConfig, Sdk} from '@circles-sdk/sdk';
    import {circles} from '$lib/stores/circles';
    import {BrowserProviderContractRunner} from '@circles-sdk/adapter-ethers';
    import {chiadoConfig, gnosisConfig} from '$lib/chiadoConfig';
    import {wallet} from "$lib/stores/wallet";
    import {goto} from "$app/navigation";
  import WalletLoader from '$lib/components/WalletLoader.svelte';

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
        localStorage.removeItem("usePK");
        localStorage.setItem("useMM", "true");

        const wallet = new BrowserProviderContractRunner();
        await wallet.init();

        $wallet = wallet;

        const network = await $wallet.provider?.getNetwork();
        if (!network) {
            throw new Error('Failed to get network');
        }
        circlesConfig = await getCirclesConfig(network.chainId);

        // Initialize the Circles SDK and set it as $circles to make it globally available.
        $circles = new Sdk($wallet!, circlesConfig);

        await goto('/connect-wallet/select-safe');
    });
</script>

<div class="w-full flex flex-col items-center min-h-screen p-4 max-w-5xl gap-y-8 mt-20">
    <WalletLoader name="Safe" />
</div>