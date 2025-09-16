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
        getGroupCollateral,
        getTreasuryAddress,
        getVaultAddress,
    } from '$lib/utils/vault';
    import CollateralTable from '$lib/components/CollateralTable.svelte';
    import {goto} from '$app/navigation';

    interface Props {
        address: Address | undefined;
        trustVersion: number | undefined;
    }

    let {address, trustVersion}: Props = $props();

    $effect(() => {
        if (address) {
            initialize(address);
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

    async function initialize(address: Address) {
        if (!$circles) {
            return;
        }

        otherAvatar = await $circles.data.getAvatarInfo(address);

        profile = await getProfile(address);

        trustRow = $contacts?.data[address]?.row;

        if (otherAvatar?.type === 'CrcV2_RegisterGroup') {
            // load the members
            const groupTrustRelations =
                await $circles.data.getAggregatedTrustRelations(otherAvatar.avatar);
            members = groupTrustRelations
                .filter((row) => row.relation === 'trusts')
                .map((o) => o.objectAvatar);

            //TODO: find mint handler and treasury in the same query
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

            mintHandler = (await findMintHandlerQuery.getSingleRow())?.mintHandler;
            console.log('mintHandler', mintHandler);

            if (!$circles) return;

            const vaultAddress = await getVaultAddress(
                $circles.circlesRpc,
                otherAvatar.avatar
            );
            const treasuryAddress = await getTreasuryAddress(
                $circles.circlesRpc,
                otherAvatar.avatar
            );

            const balancesResult = await getGroupCollateral(
                $circles.circlesRpc,
                vaultAddress ?? treasuryAddress ?? ''
            );
            if (!balancesResult) {
                collateralInTreasury = [];
                return;
            }

            const {columns, rows} = balancesResult;
            const colId = columns.indexOf('tokenId');
            const colBal = columns.indexOf('demurragedTotalBalance');

            // Build up the table data
            collateralInTreasury = rows.map((row) => ({
                avatar: uint256ToAddress(BigInt(row[colId])),
                amount: BigInt(row[colBal]),
                amountToRedeemInCircles: 0,
                amountToRedeem: 0n,
            })).sort((a, b) => a.amount > b.amount ? -1 : a.amount == b.amount ? 0 : 1)
        } else {
            members = undefined;
        }
    }

    let commonConnectionsCount = $state(0);
</script>

<div class="flex flex-col items-center w-full sm:w-[90%] lg:w-3/5 mx-auto">
    <Avatar view="vertical" clickable={false} {address}/>

    {#if trustRow}
    <span
            class="text-sm"
            class:text-green-600={trustRow?.relation === 'trusts' ||
        trustRow?.relation === 'trustedBy' ||
        trustRow?.relation === 'mutuallyTrusts'}
    >
      {formatTrustRelation(trustRow.relation, profile)}
    </span>
    {:else}
        <span class="text-sm text-gray-500">No relation available</span>
    {/if}

    <div class="my-6 flex flex-row gap-x-2">
    <span class="bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm"
    >{getTypeString(otherAvatar?.type || '')}</span
    >
        <AddressComponent address={address ?? '0x0'}/>
        {#if otherAvatar?.type === 'CrcV2_RegisterGroup'}
            <button
                    onclick={() => {
          goto('/groups/metrics/' + address);
          popupControls.close();
        }}
                    class="flex items-center justify-center bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm"
            ><img src="/chart.svg" alt="Chart" class="w-4"/></button
            >
        {/if}
        <a
                href={'https://gnosisscan.io/address/' + otherAvatar?.avatar}
                target="_blank"
                class="flex items-center justify-center bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm"
        ><img src="/external.svg" alt="External Link" class="w-4"/></a
        >
    </div>

    <div class="w-[80%] sm:w-[60%] border-b border-[#E5E7EB]"></div>

    <!-- Updated Button Layout: Flex Row for Horizontal Alignment -->
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
          // TODO: Get the group mint handler
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

<div role="tablist" class="tabs tabs-bordered w-full p-0 my-10">
    <input
            type="radio"
            name="tabs"
            value="common_connections"
            role="tab"
            class="tab h-auto"
            checked
            aria-label={`Common connections (${commonConnectionsCount})`}
    />
    <div role="tabpanel" class="tab-content mt-8 bg-base-100 border-none">
        <div class="w-full border-base-300 rounded-box border">
            <CommonConnections
                    otherAvatarAddress={otherAvatar?.avatar}
                    bind:commonConnectionsCount
            />
        </div>
    </div>

    {#if members}
        <input
                type="radio"
                name="tabs"
                value="members"
                role="tab"
                class="tab h-auto"
                aria-label={`Members (${members.length})`}
        />
        <div
                role="tabpanel"
                class="tab-content mt-8 p-4 bg-base-100 border-base-300 rounded-box divide-y"
        >
            {#each members as member (member)}
                <!-- TODO: use the generic list component -->
                <div class="-mx-4">
                    <button
                            class="flex w-full items-center justify-between p-4 bg-base-100 hover:bg-base-200"
                    >
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
        </div>
    {/if}
    {#if otherAvatar?.type === 'CrcV2_RegisterGroup'}
        <input
                type="radio"
                name="tabs"
                value="collateral"
                role="tab"
                class="tab h-auto"
                checked
                aria-label={`Collateral (${collateralInTreasury.length})`}
        />
        <div role="tabpanel" class="tab-content mt-8 bg-base-100 border-none">
            <div class="w-full border-base-300 rounded-box border">
                <CollateralTable {collateralInTreasury}/>
            </div>
        </div>
    {/if}
</div>
