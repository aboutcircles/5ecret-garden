<script lang="ts">
    import { goto } from '$app/navigation';
    import { wallet } from '$lib/stores/wallet';
    import { circles } from '$lib/stores/circles';
    import { avatar } from '$lib/stores/avatar';
    import { type CirclesConfig, Sdk } from '@circles-sdk/sdk';
    import { chiadoConfig, gnosisConfig } from '$lib/chiadoConfig';
    import { BrowserProviderContractRunner } from '@circles-sdk/adapter-ethers';
    import { onMount } from 'svelte';

    //
    // Connects the wallet and initializes the Circles SDK.
    //
    async function connectWallet() {
        const wallet = new BrowserProviderContractRunner();
        await wallet.init();

        $wallet = wallet;

        const network = await $wallet.provider?.getNetwork();
        if (!network) {
            throw new Error('Failed to get network');
        }
        const circlesConfig = await getCirclesConfig(network.chainId);

        // Initialize the Circles SDK and set it as $circles to make it globally available.
        $circles = new Sdk(circlesConfig, $wallet!);

        const avatarInfo = await $circles.data.getAvatarInfo($wallet.address!);
        console.log(avatarInfo);

        // If the signer address is already a registered Circles wallet, go straight to the dashboard.
        if (avatarInfo) {
            $avatar = await $circles.getAvatar($wallet.address!);
            await goto('/_new/dashboard');
        } else {
            await goto('/_new/register');
        }
    }

    async function getCirclesConfig(chainId: bigint): Promise<CirclesConfig> {
        switch (chainId) {
            case 100n:
                return gnosisConfig;
            case 10200n:
                return chiadoConfig;
            default:
                throw new Error(`Unsupported chain-id: ${chainId}`);
        }
    }

    onMount(() => {
        connectWallet();
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
