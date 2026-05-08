<script lang="ts">
    import {avatarState} from '$lib/shared/state/avatar.svelte';
    import {circles} from '$lib/shared/state/circles';
    import {Sdk} from '@circles-sdk/sdk';
    import {goto} from '$app/navigation';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import type {Address} from '@circles-sdk/utils';
    import {CirclesStorage} from '$lib/shared/utils/storage';
    import type {GroupRow} from '@circles-sdk/data';
    import {settings} from '$lib/shared/state/settings.svelte';
    import { openStep } from '$lib/shared/flow';
    import CreateGroup from "$lib/areas/groups/flows/createGroup/1_CreateGroup.svelte";
    import {resetCreateGroupContext} from '$lib/areas/groups/flows/createGroup/context';

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
        avatarState.groupType = groupAddress
            ? await sdk.getGroupType(groupAddress)
            : undefined;

        CirclesStorage.getInstance().data = {
            avatar: address,
            group: groupAddress,
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

        resetCreateGroupContext(address as `0x${string}`);

        openStep({
            title: "Create group",
            component: CreateGroup,
            props: {
                setGroup: async (address: string) => {
                    console.log(`Open the new group avatar dashboard. Address:`, address);
                    refreshGroupsCallback?.()
                }
            },
            onClose: () => resetCreateGroupContext()
        });
    }

    const versionLabel = $derived(
        !isRegistered ? 'Not registered' : isV1 ? 'v1' : 'v2'
    );
    const versionBadgeClass = $derived(
        !isRegistered ? 'badge-warning' : isV1 ? 'badge-neutral' : 'badge-primary'
    );
</script>

<div class="w-full bg-base-100 border border-base-300 rounded-[14px] flex flex-col overflow-hidden shadow-sm">
    <!-- Safe row -->
    <button
        onclick={() => connectAvatar()}
        class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-base-200 transition-colors text-left w-full"
    >
        <div class="min-w-0 flex-1">
            <Avatar
                topInfo={settings.legacy ? 'Connected Wallet' : 'Safe'}
                {address}
                clickable={false}
                view="horizontal"
            />
        </div>
        <span class={`badge badge-sm shrink-0 ${versionBadgeClass}`}>{versionLabel}</span>
    </button>

    {#if !isV1}
        <!-- Groups section -->
        <div class="border-t border-base-300 px-4 py-3 space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-base-content/70">My groups</span>
                <button
                    onclick={() => openCreateGroup()}
                    class="btn btn-xs btn-ghost text-primary"
                >
                    + Create group
                </button>
            </div>

            <div class="space-y-1 pl-2">
                {#each groups ?? [] as group}
                    <button
                        class="flex w-full items-center gap-3 px-3 py-2 hover:bg-base-200 rounded-lg transition-colors text-left"
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
                    <p class="text-sm text-base-content/50 py-1">No groups yet.</p>
                {/if}
            </div>
        </div>
    {/if}
</div>
