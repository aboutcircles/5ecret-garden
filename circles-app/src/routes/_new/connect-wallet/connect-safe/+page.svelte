<script lang="ts">
    import {onMount} from "svelte";
    import {ethers} from "ethers6";
    import {SafeSdkBrowserContractRunner} from "@circles-sdk/adapter-safe";
    import {chiadoConfig, gnosisConfig} from "$lib/chiadoConfig";
    import {type CirclesConfig, Sdk} from "@circles-sdk/sdk";
    import {goto} from "$app/navigation";
    import {circles} from "$lib/stores/circles";
    import {avatar} from "$lib/stores/avatar";
    import {wallet} from "$lib/stores/wallet";

    //
    // Connects the wallet and initializes the Circles SDK.
    //
    async function connectWallet(safeAddress: string) {
        const safeContractRunner = new SafeSdkBrowserContractRunner();
        await safeContractRunner.init(safeAddress);

        $wallet = safeContractRunner;

        const network = await safeContractRunner.provider?.getNetwork();
        if (!network) {
            throw new Error('Failed to get network');
        }
        const circlesConfig = await getCirclesConfig(network.chainId);

        // Initialize the Circles SDK and set it as $circles to make it globally available.
        $circles = new Sdk(circlesConfig, safeContractRunner!);

        const avatarInfo = await $circles.data.getAvatarInfo(safeContractRunner.address!);

        // If the signer address is already a registered Circles wallet, go straight to the dashboard.
        if (avatarInfo) {
            $avatar = await $circles.getAvatar(safeContractRunner.address!);
            console.log("Avatar:", $avatar);
            await goto("/_new/dashboard");
        } else {
            await goto("/_new/register");
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

    const getSafesByOwnerApiEndpoint = (checksumOwnerAddress: string): string =>
        `https://safe-transaction-gnosis-chain.safe.global/api/v1/owners/${checksumOwnerAddress}/safes/`;

    async function querySafeTransactionService(ownerAddress: string): Promise<string[]> {
        const checksumAddress = ethers.getAddress(ownerAddress);
        const requestUrl = getSafesByOwnerApiEndpoint(checksumAddress);

        const safesByOwnerResult = await fetch(requestUrl);
        const safesByOwner = await safesByOwnerResult.json();

        return safesByOwner.safes ?? [];
    }

    let safes: string[] | undefined = undefined;

    onMount(async () => {
        const safeContractRunner = new SafeSdkBrowserContractRunner();
        const signerAddress = (await safeContractRunner.browserProvider.getSigner()).address;
        safes = await querySafeTransactionService(signerAddress);
    });
</script>

<div class="hero bg-base-200 min-h-screen">
    <div class="hero-content flex-col lg:flex-row-reverse">

        <div class="card bg-base-100 w-96 shadow-xl">
            <figure class="px-10 pt-10">
                <span class="loading loading-spinner loading-lg"></span>
            </figure>
            {#if !safes}
                <div class="card-body items-center text-center">
                    <h2 class="card-title">Connecting your MetaMask wallet ...</h2>
                    <p>Please wait while we're loading your safes</p>
                </div>
            {:else}
                {#each safes as safe}
                    <div class="btn btn-outline" on:click={() => connectWallet(safe)}>{safe}</div>
                {/each}
            {/if}
        </div>
    </div>
</div>