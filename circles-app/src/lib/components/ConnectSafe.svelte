<script lang="ts">
    import { type AvatarRow } from '@circles-sdk/sdk';
    import { circles } from '$lib/stores/circles';
    import { wallet } from '$lib/stores/wallet.svelte';
    import WalletLoader from '$lib/components/WalletLoader.svelte';
    import ConnectCircles from '$lib/components/ConnectCircles.svelte';
    import CreateSafe from '$lib/pages/CreateSafe.svelte';
    import type { Address } from '@circles-sdk/utils';
    import { ethers } from 'ethers';
    import { onMount } from 'svelte';
    import type { WalletType } from '$lib/utils/walletType';
    import type { GroupRow } from '@circles-sdk/data';
    import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/utils/getGroupsByOwnerBatch';

    let safes: Address[] = $state([]);
    let profileBySafe: Record<string, AvatarRow | undefined> = $state({});
    let groupsByOwner: Record<Address, GroupRow[]> = $state({});

    interface Props {
        safeOwnerAddress?: Address;
        chainId: bigint;
        walletType: WalletType;
    }

    let { safeOwnerAddress, chainId, walletType }: Props = $props();

    // Fetch safes by owner using Circles RPC (replaces deprecated Safe Transaction Service API)
    async function querySafesByOwnerCircles(ownerAddress: string): Promise<Address[]> {
        if (!$circles) throw new Error('Circles SDK not initialized');
        const ownerLc = ownerAddress.toLowerCase();

        const result = await $circles.data.rpc.call<{
            columns: string[];
            rows: any[][];
        }>('circles_query', [
            {
                Namespace: 'V_Safe',
                Table: 'Owners',
                Columns: ['safeAddress'],
                Filter: [
                    {
                        Type: 'FilterPredicate',
                        FilterType: 'Equals',
                        Column: 'owner',
                        Value: ownerLc,
                    },
                ],
                Order: [],
                Limit: 1000,
            },
        ]);

        // Find index of safeAddress column just in case ordering differs
        const colIdx = result.result.columns.findIndex(
            (c) => c.toLowerCase() === 'safeaddress'
        );

        const safesRaw: string[] = (colIdx >= 0
                ? result.result.rows.map((r) => r[colIdx])
                : result.result.rows.map((r) => r[0]) // fallback if columns missing
        ).filter(Boolean);

        // Normalize, checksum and deduplicate
        const unique = Array.from(
            new Set(
                safesRaw.map((s) => ethers.getAddress(s).toLowerCase() as Address)
            )
        );

        return unique;
    }

    async function loadSafesAndProfile() {
        if (!safeOwnerAddress) {
            throw new Error('Safe owner address is not provided');
        }

        if (!$wallet?.address) {
            throw new Error('Wallet address is not available');
        }

        if (!$circles || !$wallet?.address) {
            throw new Error('Circles SDK or wallet not initialized');
        }
        safes = await querySafesByOwnerCircles(safeOwnerAddress);
        const [avatarInfo, groupInfo] = await Promise.all([
            $circles.data.getAvatarInfoBatch(safes),
            getBaseAndCmgGroupsByOwnerBatch($circles, safes),
        ]);
        const profileBySafeNew: Record<string, AvatarRow | undefined> = {};
        avatarInfo.forEach((info) => {
            profileBySafeNew[info.avatar] = info;
        });
        profileBySafe = profileBySafeNew;
        groupsByOwner = groupInfo;
    }

    onMount(async () => {
        await loadSafesAndProfile();
    });

    async function onsafecreated(address: Address) {
        safes = [...safes, address];
    }
</script>

<div
        class="w-full flex flex-col items-center min-h-screen max-w-xl gap-y-4 mt-20"
>
    <div class="w-full">
        <button onclick={() => history.back()}>
            <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
        </button>
    </div>
    <h2 class="font-bold text-[28px] md:text-[32px]">Select Account</h2>
    <p class="font-normal text-black/60 text-base">
        Please select the account you want to use from the list below.
    </p>
    {#if $wallet?.address && $circles}
        {#each safes ?? [] as item (item)}
            <ConnectCircles
                    address={item}
                    {walletType}
                    isRegistered={profileBySafe[item.toLowerCase()] !== undefined}
                    isV1={profileBySafe[item]?.version === 1}
                    groups={groupsByOwner[item.toLowerCase() as Address] ?? []}
                    {chainId}
            />
        {/each}

        {#if walletType === 'safe'}
            <div class="text-center">
                <CreateSafe {onsafecreated} />
            </div>
        {/if}
    {:else}
        <WalletLoader name="Safe" />
    {/if}
</div>
