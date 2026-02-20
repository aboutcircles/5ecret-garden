<script lang="ts">
    import {avatarState} from '$lib/shared/state/avatar.svelte';
    import {circles} from '$lib/shared/state/circles';
    import {Sdk} from '@aboutcircles/sdk';
    import {goto} from '$app/navigation';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import type {Address} from '@aboutcircles/sdk-types';
    import {GroupType} from '@aboutcircles/sdk-types';
    import {CirclesStorage} from '$lib/shared/utils/storage';
    import type {GroupRow} from '@aboutcircles/sdk-types';
    import {settings} from '$lib/shared/state/settings.svelte';
    import { openStep } from '$lib/shared/flow';
    import CreateGroup from "$lib/areas/groups/flows/createGroup/1_CreateGroup.svelte";
    import {resetCreateGroupContext} from '$lib/areas/groups/flows/createGroup/context';

    /**
     * Map an AvatarInfo.type string to the GroupType enum.
     * Returns undefined if the type does not correspond to a group.
     */
    function toGroupType(avatarType: string | undefined): GroupType | undefined {
        if (!avatarType || !avatarType.includes('Group')) return undefined;
        // All base groups registered via the standard factory are Standard;
        // custom groups would need additional on-chain introspection.
        return GroupType.Standard;
    }

    interface Props {
        address: Address;
        isRegistered: boolean;
        groups?: GroupRow[];
        isV1?: boolean;
        initSdk: (address: Address) => Promise<Sdk>;
        refreshGroupsCallback?: () => void;
    }

    let {address, isRegistered, groups, isV1, initSdk, refreshGroupsCallback}: Props = $props();

    async function connectAvatar(groupAddress?: Address) {
        const sdk = await initSdk(address);
        $circles = sdk;

        if (groupAddress === undefined && !isRegistered) {
            await goto(`/register?owner=${address}`);
            return;
        }
        avatarState.avatar = await sdk.getAvatar(groupAddress ?? address);
        avatarState.isGroup = !!groupAddress;
        if (groupAddress) {
            const groupInfo = await sdk.data.getAvatar(groupAddress);
            avatarState.groupType = toGroupType(groupInfo?.type);
        } else {
            avatarState.groupType = undefined;
        }

        CirclesStorage.getInstance().data = {
            avatar: address,
            group: groupAddress,
            isGroup: avatarState.isGroup,
            groupType: avatarState.groupType,
            rings: settings.ring,
        };

        goto("/dashboard")
    }

    async function openCreateGroup() {
        const sdk = await initSdk(address);
        $circles = sdk;

        // Initialize a fresh context with feeCollection defaulted to this safe address
        resetCreateGroupContext(address as `0x${string}`);

        openStep({
            title: "Create group",
            component: CreateGroup,
            props: {
                setGroup: async (address: string) => {
                    // On success, navigate into the new group#
                    console.log(`Open the new group avatar dashboard. Address:`, address);
                    refreshGroupsCallback?.()
                }
            },
            // Ensure state is cleared if the user closes the flow
            onClose: () => resetCreateGroupContext()
        });
    }
</script>

<div class="w-full border rounded-lg flex flex-col p-4 shadow-sm">
    <button
            onclick={() => connectAvatar()}
            class="flex justify-between items-center hover:bg-base-200 rounded-lg p-2"
    >
        <Avatar
                topInfo={settings.legacy ? 'Connected Wallet' : 'Safe'}
                {address}
                clickable={false}
                view="horizontal"
        />
        <div class="btn btn-xs btn-outline btn-primary">
            {#if !isRegistered}
                register
            {:else if isV1}
                V1
            {:else}
                V2
            {/if}
        </div>
    </button
    >
    {#if !isV1}
        <div class="w-full flex gap-x-2 items-center justify-between mt-6 px-2">
            <p class="font-bold text-primary">My groups</p>
            <button
                    onclick={() => openCreateGroup()}
                    class="btn btn-xs btn-outline btn-primary">Create a group
            </button
            >
        </div>
        <div class="w-full pl-6 flex flex-col gap-y-2 mt-2">
            {#each groups ?? [] as group}
                <button
                        class="flex w-full hover:bg-base-200 rounded-lg p-2"
                        onclick={() => connectAvatar(group.group)}
                >
                    <Avatar
                            address={group.group}
                            clickable={false}
                            view="horizontal"
                            topInfo={group.group}
                    />
                </button>
            {/each}
            {#if (groups ?? []).length === 0}
                <p class="text-sm">No groups available.</p>
            {/if}
        </div>
    {/if}
</div>
