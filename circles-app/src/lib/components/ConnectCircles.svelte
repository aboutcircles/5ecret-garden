<script lang="ts">
    import {avatarState} from '$lib/stores/avatar.svelte';
    import {circles} from '$lib/stores/circles';
    import {Sdk} from '@circles-sdk-v2/sdk';
    import {goto} from '$app/navigation';
    import Avatar from './avatar/Avatar.svelte';
    import type {Address} from '@circles-sdk/utils';
    import {CirclesStorage} from '$lib/utils/storage';
    import type {GroupRow} from '@circles-sdk/data';
    import {settings} from '$lib/stores/settings.svelte';
    import {popupControls} from '$lib/stores/popUp';
    import CreateGroup from "$lib/flows/createGroup/1_CreateGroup.svelte";
    import {resetCreateGroupContext} from '$lib/flows/createGroup/context';
    import {initNewSafeBrowserRunner} from '$lib/stores/wallet.svelte';
    import {circlesConfig} from '@circles-sdk-v2/core';

    interface Props {
        address: Address;
        isRegistered: boolean;
        groups?: GroupRow[];
        sdk: Sdk;
        initSdk: (address: Address) => Promise<Sdk>;
        refreshGroupsCallback?: () => void;
    }

    let {address, isRegistered, initSdk, groups, sdk, refreshGroupsCallback}: Props = $props();

    async function connectAvatar(avatarAddress?: Address) {
        //@todo pass runner here
        // Use the safe address if no specific avatar address is provided
        const targetAddress = avatarAddress ?? address;
        const sdk = await initSdk(targetAddress);
        $circles = sdk;
        if (avatarAddress === undefined && !isRegistered) {
            await goto('/register');
            return;
        }

        // Initialize new SDK with Safe runner for the selected Safe
       // const runner = await initNewSafeBrowserRunner(address as `0x${string}`);
        //const newSdk = new NewSdk(circlesConfig[100], runner);
        //$circles = newSdk;

        // Use the new SDK to get the avatar
        avatarState.avatar = await sdk.getAvatar(targetAddress);
        avatarState.isGroup = !!avatarState.avatar?.avatarInfo.isGroup;
        avatarState.isHuman = !!avatarState.avatar?.avatarInfo.isHuman;

        // Use the new SDK to get group type if it's a group
        if (avatarState.isGroup) {
            //@todo implement
            //avatarState.groupType = await sdk.getType(avatarAddress as `0x${string}`) as any;
        } else {
            avatarState.groupType = undefined;
        }

        CirclesStorage.getInstance().data = {
            avatar: address,
            group: avatarState.isGroup ? avatarAddress : undefined,
            isGroup: avatarState.isGroup,
            groupType: avatarState.groupType,
            rings: settings.ring,
            legacy: settings.legacy,
        };

        goto("/dashboard")
    }

    async function openCreateGroup() {
        const sdk = await initSdk(address);
        $circles = sdk;

        // Initialize a fresh context with feeCollection defaulted to this safe address
        resetCreateGroupContext(address as `0x${string}`);

        popupControls.open({
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
            onclick={() => connectAvatar(address)}
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
            {:else}
                V2
            {/if}
        </div>
    </button
    >
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
                    onclick={() => connectAvatar(group.group as `0x${string}`)}
            >
                <Avatar
                        address={group.group as `0x${string}`}
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
</div>
