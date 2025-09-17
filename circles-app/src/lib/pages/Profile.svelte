<script lang="ts">
    import {circles} from '$lib/stores/circles';
    import type {Profile} from '@circles-sdk/profiles';
    import CommonConnections from '$lib/components/CommonConnections.svelte';
    import {contacts} from '$lib/stores/contacts';
    import {
        type AvatarRow,
        CirclesQuery,
        type TrustRelation,
        type TrustRelationRow,
    } from '@circles-sdk/data';
    import Untrust from '$lib/pages/Untrust.svelte';
    import Trust from '$lib/pages/Trust.svelte';
    import SelectAsset from '$lib/flows/send/2_Asset.svelte';
    import {getProfile} from '$lib/utils/profile';
    import {formatTrustRelation, getTypeString} from '$lib/utils/helpers';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import {popupControls, popupState} from '$lib/stores/popUp';
    import AddressComponent from '$lib/components/Address.svelte';
    import {uint256ToAddress, type Address} from '@circles-sdk/utils';
    import SelectAmount from '$lib/flows/send/3_Amount.svelte';
    import {transitiveTransfer} from '$lib/pages/SelectAsset.svelte';
    import {
        getGroupCollateral, getGroupTokenHolders,
        getTreasuryAddress,
        getVaultAddress,
    } from '$lib/utils/vault';
    import CollateralTable from '$lib/components/CollateralTable.svelte';
    import {goto} from '$app/navigation';

    /* NEW: tabs */
    import Tabs from '$lib/components/tabs/Tabs.svelte';
    import Tab from '$lib/components/tabs/Tab.svelte';

    interface Props {
        address: Address | undefined;
        trustVersion: number | undefined;
    }

    let {address, trustVersion}: Props = $props();

    $effect(() => {
        const hasAddress: boolean = !!address;
        if (hasAddress) {
            initialize(address as Address);
        }
    });

    let otherAvatar: AvatarRow | undefined = $state();
    let profile: Profile | undefined = $state();
    let members: Address[] | undefined = $state(undefined);
    let mintHandler: Address | undefined = $state();

    let trustRow: TrustRelationRow | undefined = $state();
    let collateralInTreasury: Array<{
        avatar: Address;
        amount: bigint;
        amountToRedeem: bigint;
        amountToRedeemInCircles: number;
        trustRelation?: TrustRelation;
    }> = $state([]);

    let tokenHolders: Array<{
        avatar: Address;
        amount: bigint;
        amountToRedeem: bigint;
        amountToRedeemInCircles: number;
        trustRelation?: TrustRelation;
    }> = $state([]);

    async function initialize(address: Address) {
        const hasCircles: boolean = !!$circles;
        if (!hasCircles) {
            return;
        }

        const [other, prof] = await Promise.all([
            $circles.data.getAvatarInfo(address),
            getProfile(address),
        ]);
        otherAvatar = other;
        profile = prof;

        trustRow = $contacts?.data[address]?.row;

        const isGroup: boolean = otherAvatar?.type === 'CrcV2_RegisterGroup';
        const isHuman: boolean = otherAvatar?.type === 'CrcV2_RegisterHuman';

        if (isGroup) {
            const membersP = (async () => {
                const groupTrustRelations = await $circles.data.getAggregatedTrustRelations(otherAvatar!.avatar);
                return groupTrustRelations
                    .filter((row) => row.relation === 'trusts')
                    .map((o) => o.objectAvatar);
            })();

            const mintHandlerP = (async () => {
                const findMintHandlerQuery = new CirclesQuery<any>($circles.circlesRpc, {
                    namespace: 'V_CrcV2',
                    table: 'Groups',
                    columns: ['mintHandler'],
                    filter: [
                        {
                            Type: 'FilterPredicate',
                            FilterType: 'Equals',
                            Column: 'group',
                            Value: address,
                        },
                    ],
                    sortOrder: 'DESC',
                    limit: 1,
                });
                return (await findMintHandlerQuery.getSingleRow())?.mintHandler as Address | undefined;
            })();

            const vaultAndTreasuryP = Promise.allSettled([
                getVaultAddress($circles.circlesRpc, otherAvatar!.avatar),
                getTreasuryAddress($circles.circlesRpc, otherAvatar!.avatar),
            ]);

            const tokenHoldersP = getGroupTokenHolders($circles.circlesRpc, address);

            [members, mintHandler] = await Promise.all([membersP, mintHandlerP]);

            const [vaultRes, treasuryRes] = await vaultAndTreasuryP as [
                PromiseSettledResult<string | null>,
                PromiseSettledResult<string | null>
            ];
            const vaultAddress = vaultRes.status === 'fulfilled' ? vaultRes.value : null;
            const treasuryAddress = treasuryRes.status === 'fulfilled' ? treasuryRes.value : null;
            const balanceOwner: string = vaultAddress ?? treasuryAddress ?? '';

            const hasBalanceOwner: boolean = balanceOwner.length > 0;

            if (hasBalanceOwner) {
                const balancesResult = await getGroupCollateral($circles.circlesRpc, balanceOwner);
                if (balancesResult) {
                    const {columns, rows} = balancesResult;
                    const colId = columns.indexOf('tokenId');
                    const colBal = columns.indexOf('demurragedTotalBalance');
                    collateralInTreasury = rows
                        .map((row) => ({
                            avatar: uint256ToAddress(BigInt(row[colId])),
                            amount: BigInt(row[colBal]),
                            amountToRedeemInCircles: 0,
                            amountToRedeem: 0n,
                        }))
                        .sort((a, b) => (a.amount > b.amount ? -1 : a.amount === b.amount ? 0 : 1));
                } else {
                    collateralInTreasury = [];
                }
            } else {
                collateralInTreasury = [];
            }

            const tokenHodlers = await tokenHoldersP;
            if (tokenHodlers) {
                const {columns, rows} = tokenHodlers;
                const avatarIdx = columns.indexOf('account');
                const colBal = columns.indexOf('demurragedTotalBalance');
                tokenHolders = rows
                    .map((row) => ({
                        avatar: row[avatarIdx],
                        amount: BigInt(row[colBal]),
                        amountToRedeemInCircles: 0,
                        amountToRedeem: 0n,
                    }))
                    .sort((a, b) => (a.amount > b.amount ? -1 : a.amount === b.amount ? 0 : 1));
            } else {
                tokenHolders = [];
            }
        } else {
            members = undefined;

            if (isHuman) {
                const tokenHodlers = await getGroupTokenHolders($circles.circlesRpc, address);
                if (tokenHodlers) {
                    const {columns, rows} = tokenHodlers;
                    const avatarIdx = columns.indexOf('account');
                    const colBal = columns.indexOf('demurragedTotalBalance');
                    tokenHolders = rows
                        .map((row) => ({
                            avatar: row[avatarIdx],
                            amount: BigInt(row[colBal]),
                            amountToRedeemInCircles: 0,
                            amountToRedeem: 0n,
                        }))
                        .sort((a, b) => (a.amount > b.amount ? -1 : a.amount === b.amount ? 0 : 1));
                } else {
                    tokenHolders = [];
                }
            }
        }
    }

    let selectedTab: string = 'common_connections';
    let commonConnectionsCount = $state(0);
</script>

<div class="flex flex-col items-center w-full sm:w-[90%] lg:w-3/5 mx-auto">
    <Avatar view="vertical" clickable={false} {address}/>

    {#if trustRow}
        <span
                class="text-sm"
                class:text-green-600={trustRow?.relation === 'trusts' || trustRow?.relation === 'trustedBy' || trustRow?.relation === 'mutuallyTrusts'}
        >
            {formatTrustRelation(trustRow.relation, profile)}
        </span>
    {:else}
        <span class="text-sm text-gray-500">No relation available</span>
    {/if}

    <div class="my-6 flex flex-row gap-x-2">
        <span class="bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm">
            {getTypeString(otherAvatar?.type || '')}
        </span>
        <AddressComponent address={address ?? '0x0'}/>
        {#if otherAvatar?.type === 'CrcV2_RegisterGroup'}
            <button
                    onclick={() => {
                    goto('/groups/metrics/' + address);
                    popupControls.close();
                }}
                    class="flex items-center justify-center bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm"
            >
                <img src="/chart.svg" alt="Chart" class="w-4"/>
            </button>
        {/if}
        <a
                href={'https://gnosisscan.io/address/' + otherAvatar?.avatar}
                target="_blank"
                class="flex items-center justify-center bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm"
        >
            <img src="/external.svg" alt="External Link" class="w-4"/>
        </a>
    </div>

    <div class="w-[80%] sm:w-[60%] border-b border-[#E5E7EB]"></div>

    <div class="w-full flex justify-center mt-6 space-x-6">
        <button
                class="btn btn-primary text-white"
                onclick={() => {
                popupControls.open({
                    title: 'Send Circles',
                    component: SelectAsset,
                    props: {
                        context: {
                            selectedAddress: otherAvatar?.avatar,
                        },
                    },
                });
            }}
        >
            <img src="/send-new.svg" alt="Send" class="w-5 h-5"/>
            Send
        </button>
        {#if otherAvatar?.type === 'CrcV2_RegisterGroup' && !!mintHandler}
            <button
                    class="btn bg-[#F3F4F6] border-none"
                    onclick={() => {
                    popupControls.open({
                        title: 'Enter Amount',
                        component: SelectAmount,
                        props: {
                            asset: transitiveTransfer(),
                            selectedAddress: mintHandler,
                            transitiveOnly: true,
                            amount: 0,
                            context: {
                                selectedAddress: mintHandler,
                                transitiveOnly: true,
                                selectedAsset: transitiveTransfer(),
                                amount: 0,
                            },
                        },
                    });
                }}
            >
                Mint
            </button>
        {/if}
        {#if trustRow?.relation === 'trusts'}
            <button
                    class="btn bg-[#F3F4F6] border-none"
                    onclick={() => {
                    popupControls.open({
                        title: 'Untrust',
                        component: Untrust,
                        props: {
                            address: address,
                            trustVersion: trustVersion,
                        },
                    });
                }}
            >
                Untrust
            </button>
        {:else if trustRow?.relation === 'mutuallyTrusts'}
            <button
                    class="btn bg-[#F3F4F6] border-none"
                    onclick={() => {
                    popupControls.open({
                        title: 'Untrust',
                        component: Untrust,
                        props: {
                            address: address,
                        },
                    });
                }}
            >
                Untrust
            </button>
        {:else if trustRow?.relation === 'trustedBy'}
            <button
                    class="btn bg-[#F3F4F6] border-none"
                    onclick={() => {
                    popupControls.open({
                        title: 'Trust',
                        component: Trust,
                        props: {
                            address: address,
                        },
                    });
                }}
            >
                Trust back
            </button>
        {:else}
            <button
                    class="btn bg-[#F3F4F6] border-none"
                    onclick={() => {
                    popupControls.open({
                        title: 'Trust',
                        component: Trust,
                        props: {
                            address: address,
                        },
                    });
                }}
            >
                Trust
            </button>
        {/if}
    </div>
</div>

<Tabs
        id="profile-tabs"
        bind:selected={selectedTab}
        variant="bordered"
        size="md"
        class="w-full p-0 mt-8"
        fitted={false}
>
    <Tab
            id="common_connections"
            title="Common connections"
            badge={commonConnectionsCount}
            panelClass="bg-base-100 border-none"
    >
        <div class="w-full">
            <CommonConnections
                    otherAvatarAddress={otherAvatar?.avatar}
                    bind:commonConnectionsCount
            />
        </div>
    </Tab>

    {#if members}
        <Tab
                id="members"
                title="Members"
                badge={members.length}
                panelClass="p-4 bg-base-100 border-base-300 rounded-box divide-y"
        >
            {#each members as member (member)}
                <div class="-mx-4">
                    <button class="flex w-full items-center justify-between p-4 bg-base-100 hover:bg-base-200">
                        <Avatar address={member} view="horizontal"/>
                        <div class="font-medium underline flex gap-x-2">
                            <img src="/chevron-right.svg" alt="Chevron Right" class="w-4"/>
                        </div>
                    </button>
                </div>
            {/each}
            {#if members.length === 0}
                <div>No members</div>
            {/if}
        </Tab>
    {/if}

    {#if otherAvatar?.type === 'CrcV2_RegisterGroup'}
        <Tab
                id="collateral"
                title="Collateral"
                badge={collateralInTreasury.length}
                panelClass="bg-base-100 border-none"
        >
            <div class="w-full">
                <CollateralTable {collateralInTreasury}/>
            </div>
        </Tab>
    {/if}

    {#if otherAvatar?.type === 'CrcV2_RegisterGroup' || otherAvatar?.type === 'CrcV2_RegisterHuman'}
        <Tab
                id="holders"
                title="Holders"
                badge={tokenHolders.length}
                panelClass="bg-base-100 border-none"
        >
            <div class="w-full">
                <CollateralTable collateralInTreasury={tokenHolders}/>
            </div>
        </Tab>
    {/if}
</Tabs>

