<script lang="ts">
    import {goto} from '$app/navigation';
    import Avatar from '$lib/components/Avatar.svelte';
    import type {PopupContentApi} from '$lib/components/PopUp.svelte';
    import {avatar} from '$lib/stores/avatar';
    import {circles} from '$lib/stores/circles';
    import {shortenAddress} from '$lib/utils/shared';
    import {SafeSdkBrowserContractRunner, SafeSdkPrivateKeyContractRunner} from '@circles-sdk/adapter-safe';
    import {Sdk, type CirclesConfig} from '@circles-sdk/sdk';
    import {createEventDispatcher, onMount} from "svelte";
    import {ethers} from "ethers6";
    import {chiadoConfig, gnosisConfig} from "$lib/chiadoConfig";
    import {wallet} from "$lib/stores/wallet";

    export let safes: string[] = [];
    export let circlesConfig: CirclesConfig;
    export let contentApi: PopupContentApi | undefined;

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

    const getSafesByOwnerApiEndpoint = (checksumOwnerAddress: string): string =>
        `https://safe-transaction-gnosis-chain.safe.global/api/v1/owners/${checksumOwnerAddress}/safes/`;

    async function querySafeTransactionService(
        ownerAddress: string
    ): Promise<string[]> {
        const checksumAddress = ethers.getAddress(ownerAddress);
        const requestUrl = getSafesByOwnerApiEndpoint(checksumAddress);

        const safesByOwnerResult = await fetch(requestUrl);
        const safesByOwner = await safesByOwnerResult.json();

        return safesByOwner.safes ?? [];
    }

    onMount(async () => {
        if (!$wallet.address) {
            throw new Error('Wallet address is not available');
        }
        if ($wallet instanceof SafeSdkBrowserContractRunner) {
            const signer = await $wallet.browserProvider.getSigner();
            safes = await querySafeTransactionService(signer.address);
        } else {
            safes = await querySafeTransactionService($wallet.address!);
        }
    });

    //
    // Connects the wallet and initializes the Circles SDK.
    //
    async function connectWallet(safeAddress: string) {
        // const safeContractRunner = new SafeSdkPrivateKeyContractRunner();

        const key = localStorage.getItem('privateKey');
        let safeContractRunner: any;
        if (localStorage.getItem("useMM")) {
            console.log(`Using MetaMAsk as signer`)
            const runner = new SafeSdkBrowserContractRunner();
            await runner.init(safeAddress);
            safeContractRunner = runner;
        } else {
            console.log(`Using private key from localStorage`)
            const runner = new SafeSdkPrivateKeyContractRunner(key!, gnosisConfig.circlesRpcUrl);
            await runner.init(safeAddress);
            safeContractRunner = runner;
        }

        $wallet = safeContractRunner;

        const network = await $wallet.provider?.getNetwork();
        if (!network) {
            throw new Error('Failed to get network');
        }
        circlesConfig = await getCirclesConfig(network.chainId);

        // Initialize the Circles SDK and set it as $circles to make it globally available.
        $circles = new Sdk(safeContractRunner!, circlesConfig);

        contentApi?.close();

        const avatarInfo = await $circles.data.getAvatarInfo(
            safeContractRunner.address!
        );

        // If the signer address is already a registered Circles wallet, go straight to the dashboard.
        if (avatarInfo) {
            $avatar = await $circles.getAvatar(safeContractRunner.address!);
            await goto('/_new/dashboard');
        } else {
            await goto('/_new/register');
        }
    }

    const eventDispatcher = createEventDispatcher();
</script>


<div class="overflow-x-auto">
    {#each (safes ?? []) as item (item)}
        <div on:click={() => eventDispatcher("select", item)}>
            <button class="flex items-center justify-between text-left p-2 bg-base-100 hover:bg-base-200 rounded-lg w-full"
                    on:click={() => connectWallet(item)}>
                <div class="col">
                    <Avatar contentApi={contentApi} address={item.toLowerCase()} clickable={false}>
                        {shortenAddress(item.toLowerCase())}
                    </Avatar>
                </div>
            </button>
        </div>
    {/each}
    {#if (safes ?? []).length === 0}
        <div class="text-center">
            <p>No safes available.</p>
        </div>
    {/if}
</div>