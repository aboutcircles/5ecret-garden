<script lang="ts">

    import { shortenAddress } from "$lib/utils/shared";
    import { SafeSdkBrowserContractRunner } from "@circles-sdk/adapter-safe";
    import { onMount } from "svelte";
    import { ethers } from "ethers6";
    import {initializeWallet, wallet} from "$lib/stores/wallet";
    import CreateSafe from "$lib/pages/CreateSafe.svelte";
    import Avatar from "$lib/components/avatar/Avatar.svelte";
    import { fetchGroupsByOwner } from '$lib/utils/groups';
    import ConnectCircles from "$lib/components/ConnectCircles.svelte";
    import {goto} from "$app/navigation";
    import { circles } from "$lib/stores/circles";
    import {getCirclesConfig} from "$lib/utils/helpers";
    import {Sdk} from "@circles-sdk/sdk";
    import {avatar} from "$lib/stores/avatar";

    let safes: string[] = [];
    let groupsByAddress: Record<string, string[]>;

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

    onMount(loadSafesAndGroups);

    async function loadSafesAndGroups() {
        if (!$wallet) {
            throw new Error('Wallet address is not available');
        }

        const ownerAddress =
            $wallet instanceof SafeSdkBrowserContractRunner
                ? await $wallet.browserProvider.getSigner().then((s) => s.address)
                : $wallet.address!;

        safes = await querySafeTransactionService(ownerAddress);

        const groupFetchPromises = safes.map(async (safe) => {
            const groups = await fetchGroupsByOwner(safe);
            console.log(groups);
            groupsByAddress = { ...groupsByAddress, [safe]: groups.flat() };
        });

        await Promise.all(groupFetchPromises);
    }

    async function handleSafeCreated(event: CustomEvent) {
        console.log('handleSafeCreated triggered!', event.detail);
        const newSafeAddress = event.detail.address;
        safes = [...safes, newSafeAddress];
    }

    //
    // Connects the wallet and initializes the Circles SDK.
    //

    // bottomInfo={shortenAddress(item.toLowerCase()) +
    //       (groupsByAddress[item].length > 0
    //         ? ' - owner ' + groupsByAddress[item].length + ' groups'
    //         : '')}

    let manualSafeAddress: string = localStorage.getItem('manualSafeAddress') ?? '';

    async function connectWallet(safeAddress: string) {
        $wallet = await initializeWallet('safe', safeAddress);

        const network = await $wallet?.provider?.getNetwork();
        if (!network) {
            throw new Error('Failed to get network');
        }
        var circlesConfig = await getCirclesConfig(network.chainId);

        // Initialize the Circles SDK and set it as $circles to make it globally available.
        $circles = new Sdk($wallet!, circlesConfig);

        const avatarInfo = await $circles.data.getAvatarInfo(
            $wallet.address!
        );

        // If the signer address is already a registered Circles wallet, go straight to the dashboard.
        if (avatarInfo) {
            $avatar = await $circles.getAvatar($wallet.address!);
            await goto('/dashboard');
        } else {
            await goto('/register');
        }

        localStorage.setItem('manualSafeAddress', safeAddress);
    }
</script>


<div class="w-full border rounded-lg flex justify-between items-center p-4 shadow-sm">
    <input type="text" placeholder="Enter safe address .." bind:value={manualSafeAddress} class="w-full"/>
    <img src="/chevron-right.svg" alt="Chevron Right" class="w-4 cursor-pointer" on:click={() => connectWallet(manualSafeAddress)}/>
</div>
{#each safes ?? [] as item (item)}
    <ConnectCircles address={item}>
        <Avatar
                address={item.toLowerCase()}
                clickable={false}
                view="horizontal"

        />
    </ConnectCircles>
{/each}
{#if (safes ?? []).length === 0}
    <div class="text-center">
        <p class="font-normal text-base mb-5">
            No safes available. Create new safe.
        </p>
        <CreateSafe on:safecreated={handleSafeCreated} />
    </div>
{/if}
