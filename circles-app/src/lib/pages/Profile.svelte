<script lang="ts">
    import {circles} from '$lib/stores/circles';
    import type {Profile} from '@circles-sdk/profiles';
    import Avatar, {getProfile} from '$lib/components/Avatar.svelte';
    import {avatar} from '$lib/stores/avatar';
    import CommonConnections from '$lib/components/CommonConnections.svelte';
    import {shortenAddress} from '$lib/utils/shared';
    import type {Readable} from 'svelte/store';
    import type {ContactList} from '$lib/stores/contacts';
    import {onMount} from 'svelte';
    import type {AvatarRow, TrustRelationRow} from '@circles-sdk/data';
    import {ensureContacts} from '../../routes/+layout.svelte';
    import Untrust from '$lib/pages/Untrust.svelte';
    import Trust from '$lib/pages/Trust.svelte';
    import SelectAsset from '$lib/flows/send/2_Asset.svelte';
    import MintGroupTokens from '$lib/flows/mintGroupTokens/1_To.svelte';
    import type {PopupContentApi} from '$lib/components/PopUp.svelte';

    let contacts:
        | Readable<{
        data: ContactList;
        next: () => Promise<boolean>;
        ended: boolean;
    }>
        | undefined = undefined;

    export let address: string | undefined;
    export let contentApi: PopupContentApi | undefined;
    export let trustVersion: number | undefined;

    onMount(async () => {
        contacts = await ensureContacts();
    });

    $: {
        if (address) {
            initialize(address);
        }
    }

    let otherAvatar: AvatarRow | undefined;
    let profile: Profile | undefined;
    let members: string[] | undefined = undefined;
    let activeTab = 'common_connections';

    async function initialize(address?: string) {
        if (!address) {
            return;
        }
        if (!$circles) {
            return;
        }
        if (!$avatar) {
            return;
        }

        otherAvatar = await $circles.data.getAvatarInfo(address);
        if (otherAvatar) {
            profile = await getProfile(otherAvatar.avatar);
        }

        if (otherAvatar?.type === 'CrcV2_RegisterGroup') {
            // load the members
            const groupTrustRelations =
                await $circles.data.getAggregatedTrustRelations(otherAvatar.avatar);
            members = groupTrustRelations
                .filter((row) => row.relation === 'trusts')
                .map((o) => o.objectAvatar);
        } else {
            members = undefined;
        }

        if (!profile) {
            profile = {
                name: otherAvatar?.name ?? address,
            };
        }

        activeTab = 'common_connections';
    }

    function getTypeString(type: string | undefined) {
        if (!type) {
            return '';
        }
        if (type === 'CrcV2_RegisterHuman') {
            return 'Human';
        } else if (type === 'CrcV2_RegisterGroup') {
            return 'Group';
        } else if (type === 'CrcV2_RegisterOrganization') {
            return 'Organization';
        } else if (type === 'CrcV1_Signup') {
            return 'Human (v1)';
        }
        return '';
    }

    function getRelationText(row: TrustRelationRow, profile?: Profile) {
        if (!row) {
            return `You don't trust each other`;
        }
        if (row.relation === 'mutuallyTrusts') {
            return `You accept each others tokens`;
        } else if (row.relation === 'trustedBy') {
            return `${profile?.name} accepts your tokens`;
        } else if (row.relation === 'trusts') {
            return `You accept ${profile?.name}'s tokens`;
        } else if (row.relation === 'variesByVersion') {
            return `Trust relationship varies by version`;
        } else {
            return row.relation;
        }
    }

    function getTrustRow(address: string | undefined) {
        if (!address) {
            return undefined;
        }
        if (!$contacts) {
            return undefined;
        }
        return $contacts.data[address]?.row;
    }

    // function nextProfile(address: string) {
    //   contentApi?.open?.({
    //     title: shortenAddress(address),
    //     component: ProfilePage,
    //     props: {
    //       address: address,
    //       contentApi: contentApi,
    //     },
    //   });
    // }

    let commonConnectionsCount = 0;

    let copyIcon = '/copy.svg';

    function handleCopy() {
        navigator.clipboard.writeText(otherAvatar?.avatar ?? '');
        copyIcon = '/check.svg';

        setTimeout(() => {
            copyIcon = '/copy.svg';
        }, 1000);
    }
</script>

<div class="flex flex-col items-center w-full sm:w-[90%] lg:w-3/5 mx-auto">
    <Avatar
            view="vertical"
            clickable={false}
            address={otherAvatar?.avatar}
            {trustVersion}
    >
    </Avatar>

    <span>
    <span
            class="text-sm"
            class:text-red-500={getTrustRow(otherAvatar?.avatar)?.relation === 'variesByVersion'}
            class:text-green-600={getTrustRow(otherAvatar?.avatar)?.relation ===
        'trusts' ||
        getTrustRow(otherAvatar?.avatar)?.relation === 'trustedBy' ||
        getTrustRow(otherAvatar?.avatar)?.relation === 'mutuallyTrusts'}
    >{getRelationText(getTrustRow(otherAvatar?.avatar), profile)}</span
    >
  </span>

    <div class="my-6 flex flex-row gap-x-2">
        <span class="bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm">{getTypeString(otherAvatar?.type)}</span>
        <button
                on:click={handleCopy}
                class="bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm flex flex-row items-center gap-x-1 font-medium hover:text-black/70 hover:cursor-pointer"
        >
            {shortenAddress(otherAvatar?.avatar)}
            <img src={copyIcon} alt="Copy" class="w-4 h-4 inline"/>
        </button>
    </div>

    <div class="w-[80%] sm:w-[60%] border-b border-[#E5E7EB]"></div>

    <!-- Updated Button Layout: Flex Row for Horizontal Alignment -->
    <div class="w-full flex justify-center mt-6 space-x-6">
        <button
                class="btn btn-primary text-white"
                on:click={() => {
        contentApi?.open?.({
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
        {#if getTrustRow(otherAvatar?.avatar)?.relation === 'trustedBy' && otherAvatar.type === 'CrcV2_RegisterGroup'}
            <button
                    class="btn bg-[#F3F4F6] border-none"
                    on:click={() => {
          contentApi?.open?.({
            title: 'Mint group tokens',
            component: MintGroupTokens,
            props: {
              address: address,
            },
          });
        }}
            >
                Mint
            </button>
        {/if}
        {#if getTrustRow(otherAvatar?.avatar)?.relation === 'trusts'}
            <button
                    class="btn bg-[#F3F4F6] border-none"
                    on:click={() => {
          contentApi?.open?.({
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
        {:else if getTrustRow(otherAvatar?.avatar)?.relation === 'mutuallyTrusts'}
            <button
                    class="btn bg-[#F3F4F6] border-none"
                    on:click={() => {
          contentApi?.open?.({
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
        {:else if getTrustRow(otherAvatar?.avatar)?.relation === 'trustedBy'}
            <button
                    class="btn bg-[#F3F4F6] border-none"
                    on:click={() => {
          contentApi?.open?.({
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
                    on:click={() => {
          contentApi?.open?.({
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
            aria-label={`Common connections (${commonConnectionsCount})`}
            bind:group={activeTab}
    />
    <div
            role="tabpanel"
            class="tab-content mt-8 bg-base-100 border-none"
    >
        <div class="w-full border-base-300 rounded-box border">
            <CommonConnections
                    {contentApi}
                    otherAvatarAddress={otherAvatar?.avatar ?? ''}
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
                bind:group={activeTab}
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
                        <Avatar address={member} {contentApi}>
                            <!-- <div>
                                {#if $contacts?.data[address]}
                                    <span class="text-[#6B7280]">{formatTrustRelation($contacts.data[address].row)}</span>
                                {/if}
                            </div> -->

                        </Avatar>
                        <div class="font-medium underline flex gap-x-2">
                            <img
                                    src="/chevron-right.svg"
                                    alt="Chevron Right"
                                    class="w-4"
                            />
                        </div>
                    </button>
                </div>
            {/each}
            {#if members.length === 0}
                <div>No members</div>
            {/if}
        </div>
    {/if}
</div>
