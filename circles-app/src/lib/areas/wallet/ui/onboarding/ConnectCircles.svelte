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
    import { T } from '$lib/design-system/tokens.js';
    import Icon from '$lib/design-system/Icon.svelte';

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
                setGroup: async (_address: string) => {
                    refreshGroupsCallback?.();
                }
            },
            onClose: () => resetCreateGroupContext()
        });
    }

    const versionLabel = $derived(
        !isRegistered ? 'Not registered' : isV1 ? 'v1' : 'v2'
    );
    const versionPalette = $derived(
        !isRegistered
            ? { bg: T.warningSoft, fg: T.warning }
            : isV1
                ? { bg: T.pageDeep, fg: T.inkBody }
                : { bg: T.primarySoft, fg: T.primaryDeep }
    );
</script>

<div style="
    width:100%;background:{T.surface};border:1px solid {T.hairlineSoft};
    border-radius:16px;overflow:hidden;box-shadow:{T.shadow.xs};
    display:flex;flex-direction:column;
">
    <button
        onclick={() => connectAvatar()}
        style="
            display:flex;align-items:center;justify-content:space-between;gap:12px;
            padding:14px 16px;width:100%;background:transparent;border:0;cursor:pointer;text-align:left;
            transition:background .12s;
        "
        class="hover:bg-base-200"
    >
        <div style="min-width:0;flex:1;">
            <Avatar
                topInfo={settings.legacy ? 'Connected Wallet' : 'Safe'}
                {address}
                clickable={false}
                view="horizontal"
            />
        </div>
        <span style="
            display:inline-flex;align-items:center;flex-shrink:0;
            padding:3px 9px;border-radius:9999px;
            background:{versionPalette.bg};color:{versionPalette.fg};
            font-family:{T.fontSans};font-size:10.5px;font-weight:580;letter-spacing:0.02em;
        ">{versionLabel}</span>
    </button>

    {#if !isV1}
        <div style="border-top:1px solid {T.hairlineSoft};padding:12px 16px 14px;display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
                <span style="font-size:10.5px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">My groups</span>
                <button
                    onclick={() => openCreateGroup()}
                    style="
                        display:inline-flex;align-items:center;gap:4px;
                        height:24px;padding:0 10px;border-radius:9999px;
                        background:{T.primarySoft};color:{T.primaryDeep};border:0;cursor:pointer;
                        font-family:{T.fontSans};font-size:11px;font-weight:580;
                    "
                >
                    <Icon name="plus" size={11} stroke={T.primaryDeep} strokeWidth={2.2} />
                    Create
                </button>
            </div>

            <div style="display:flex;flex-direction:column;gap:2px;">
                {#each groups ?? [] as group}
                    <button
                        onclick={() => connectAvatar(group.group)}
                        style="
                            display:flex;align-items:center;gap:10px;width:100%;
                            padding:8px 10px;border-radius:10px;
                            background:transparent;border:0;cursor:pointer;text-align:left;
                            transition:background .1s;
                        "
                        class="hover:bg-base-200"
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
                    <span style="font-size:12px;color:{T.inkMuted};padding:6px 10px;">No groups yet.</span>
                {/if}
            </div>
        </div>
    {/if}
</div>
