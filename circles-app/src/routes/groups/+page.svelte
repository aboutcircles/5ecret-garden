<script lang="ts">
    import { derived, type Readable } from 'svelte/store';
    import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
    import { createCMGroups } from '$lib/areas/groups/state';
    import type { EventRow, GroupRow } from '@circles-sdk/data';
    import GroupRowView from './GroupRowView.svelte';
    import AvatarRowPlaceholder from '$lib/shared/ui/lists/placeholders/AvatarRowPlaceholder.svelte';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { openFlowPopup } from '$lib/shared/state/popup';
    import CreateGroup from '$lib/areas/groups/flows/createGroup/1_CreateGroup.svelte';
    import GroupCard from './GroupCard.svelte';
    import { resetCreateGroupContext } from '$lib/areas/groups/flows/createGroup/context';
    import { circles } from '$lib/shared/state/circles';
    import { CirclesStorage } from '$lib/shared/utils/storage';
    import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/shared/utils/getGroupsByOwnerBatch';
    import { getGroupsByMember } from '$lib/areas/groups/utils/getGroupsByMemberBatch';

    import { T } from '$lib/design-system/tokens.js';
    import Icon from '$lib/design-system/Icon.svelte';

    let groups: Readable<{
        data: EventRow[];
        next: () => Promise<boolean>;
        ended: boolean;
    }> | undefined = $state();
    let allGroupsListScopeEl: HTMLDivElement | null = $state(null);

    let ownedGroups: GroupRow[] = $state([]);
    let ownedGroupsLoading: boolean = $state(false);
    let ownedGroupsError: string | null = $state(null);

    let memberships: GroupRow[] = $state([]);
    let membershipsLoading: boolean = $state(false);
    let membershipsError: string | null = $state(null);

    let ownedGroupsLoadedForAvatar: string | null = $state(null);
    let membershipsLoadedForAvatar: string | null = $state(null);
    let allGroupsLoadedForAvatar: string | null = $state(null);

    type TabId = 'yours' | 'memberships' | 'all';
    let selectedTab: TabId = $state('yours');

    const ownerAddress: string | undefined = $derived(
        (CirclesStorage.getInstance().avatar as string | undefined) ?? avatarState.avatar?.address
    );
    const canShowMembershipsTab: boolean = $derived(!!ownerAddress);
    const canCreateGroup: boolean = $derived(!!$circles && !!CirclesStorage.getInstance().avatar);

    async function loadGroups(): Promise<void> {
        if (!avatarState.avatar) return;
        groups = await createCMGroups(avatarState.avatar);
    }

    async function loadOwnedGroups(): Promise<void> {
        if (!$circles || !ownerAddress) {
            ownedGroups = []; ownedGroupsLoading = false; ownedGroupsError = null;
            return;
        }
        ownedGroupsLoading = true; ownedGroupsError = null;
        try {
            const result = await getBaseAndCmgGroupsByOwnerBatch($circles, [ownerAddress as any]);
            ownedGroups = result[(ownerAddress as string).toLowerCase() as any] ?? result[ownerAddress as any] ?? [];
            ownedGroupsLoadedForAvatar = String(ownerAddress).toLowerCase();
        } catch (e) {
            ownedGroupsError = e instanceof Error ? e.message : String(e);
            ownedGroups = [];
        } finally { ownedGroupsLoading = false; }
    }

    async function loadMemberships(): Promise<void> {
        if (!$circles || !ownerAddress) {
            memberships = []; membershipsLoading = false; membershipsError = null;
            return;
        }
        membershipsLoading = true; membershipsError = null;
        try {
            memberships = await getGroupsByMember($circles, ownerAddress as any);
            membershipsLoadedForAvatar = String(ownerAddress).toLowerCase();
        } catch (e) {
            membershipsError = e instanceof Error ? e.message : String(e);
            memberships = [];
        } finally { membershipsLoading = false; }
    }

    $effect(() => {
        const avatar = avatarState.avatar;
        if (!avatar) { groups = undefined; allGroupsLoadedForAvatar = null; return; }
        if (selectedTab !== 'all') return;
        const avatarKey = String(avatar.address).toLowerCase();
        if (allGroupsLoadedForAvatar === avatarKey && groups) return;
        allGroupsLoadedForAvatar = avatarKey;
        void loadGroups();
    });

    $effect(() => {
        if (!$circles || !ownerAddress) {
            ownedGroups = []; ownedGroupsError = null; ownedGroupsLoading = false;
            memberships = []; membershipsError = null; membershipsLoading = false;
            ownedGroupsLoadedForAvatar = null; membershipsLoadedForAvatar = null;
            return;
        }
        const ownerKey = String(ownerAddress).toLowerCase();
        if (ownedGroupsLoadedForAvatar !== ownerKey && !ownedGroupsLoading) {
            void loadOwnedGroups();
        }
    });

    $effect(() => {
        if (selectedTab !== 'memberships' || !$circles || !ownerAddress) return;
        const ownerKey = String(ownerAddress).toLowerCase();
        if (membershipsLoadedForAvatar === ownerKey || membershipsLoading) return;
        void loadMemberships();
    });

    $effect(() => {
        const availableTabs: TabId[] = ['yours'];
        if (canShowMembershipsTab) availableTabs.push('memberships');
        availableTabs.push('all');
        if (!availableTabs.includes(selectedTab)) selectedTab = availableTabs[0];
    });

    async function openCreateGroup(): Promise<void> {
        const safeAddress = CirclesStorage.getInstance().avatar;
        if (!$circles || !safeAddress) return;
        resetCreateGroupContext(safeAddress as `0x${string}`);
        openFlowPopup({
            title: 'Create group',
            component: CreateGroup,
            props: {
                setGroup: async (_address: string) => {
                    await loadGroups();
                    await loadOwnedGroups();
                }
            },
            onClose: () => resetCreateGroupContext()
        } as any);
    }

    const totalCount = $derived(ownedGroups.length + memberships.length);
    const tabItems = $derived([
        { id: 'yours' as TabId,       label: 'My groups',   count: ownedGroups.length },
        ...(canShowMembershipsTab ? [{ id: 'memberships' as TabId, label: 'Memberships', count: memberships.length }] : []),
        { id: 'all' as TabId,         label: 'Discover',    count: undefined as number | undefined },
    ]);
</script>

<div style="background:{T.page};min-height:100%;width:100%;font-family:{T.fontSans};color:{T.inkBody};">
    <div style="padding:8px 18px 24px;" class="md:!p-9 md:max-w-[1280px] md:mx-auto">

        <!-- Page title -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0 14px;">
            <div style="display:flex;flex-direction:column;gap:2px;">
                <span style="font-family:{T.fontDisplay};font-size:32px;color:{T.ink};letter-spacing:-0.02em;line-height:1;font-weight:400;">Groups</span>
                <span style="font-size:12.5px;color:{T.inkMuted};">
                    {ownedGroups.length} owned{canShowMembershipsTab ? ` · ${memberships.length} member of` : ''}
                </span>
            </div>
            <button
                onclick={openCreateGroup}
                disabled={!canCreateGroup}
                style="
                    height:40px;padding:0 14px;border-radius:9999px;
                    background:{T.primary};color:#fff;border:0;cursor:pointer;
                    display:inline-flex;align-items:center;gap:6px;
                    font-family:{T.fontSans};font-size:13.5px;font-weight:540;
                    box-shadow:0 1px 0 rgba(255,255,255,0.18) inset, 0 1px 2px rgba(15,10,30,0.12);
                    opacity:{canCreateGroup ? 1 : 0.5};
                "
            >
                <Icon name="plus" size={15} stroke="#fff" strokeWidth={2.0} />
                Create group
            </button>
        </div>

        <!-- Featured card (only on My groups tab when no groups) -->
        {#if selectedTab === 'yours' && ownedGroups.length === 0 && !ownedGroupsLoading}
            <div style="
                padding:20px;border-radius:24px;margin-top:6px;
                background:linear-gradient(120deg,{T.lilacSoft} 0%,{T.coralSoft} 70%,{T.butterSoft} 100%);
            ">
                <span style="display:inline-block;font-size:11.5px;font-weight:580;background:{T.ink};color:{T.butter};padding:3px 9px;border-radius:9999px;">Get started</span>
                <h3 style="margin:10px 0 4px;font-family:{T.fontDisplay};font-size:28px;font-weight:400;color:{T.ink};letter-spacing:-0.02em;line-height:1.1;">Start your own currency</h3>
                <p style="margin:0;font-size:13px;color:{T.inkBody};line-height:1.45;">Create a group to coordinate with your community — pool credit, organize mutual aid, or experiment.</p>
                <div style="display:flex;align-items:center;gap:10px;margin-top:14px;">
                    <button
                        onclick={openCreateGroup}
                        disabled={!canCreateGroup}
                        style="
                            height:36px;padding:0 14px;border-radius:9999px;
                            background:{T.primary};color:#fff;border:0;cursor:pointer;
                            display:inline-flex;align-items:center;gap:6px;
                            font-family:{T.fontSans};font-size:13px;font-weight:540;
                            opacity:{canCreateGroup ? 1 : 0.5};
                        "
                    >
                        <Icon name="plus" size={14} stroke="#fff" strokeWidth={2.0} />
                        Create group
                    </button>
                    <button
                        onclick={() => selectedTab = 'all'}
                        style="
                            height:36px;padding:0 14px;border-radius:9999px;
                            background:transparent;color:{T.ink};border:1px solid {T.hairline};cursor:pointer;
                            display:inline-flex;align-items:center;gap:6px;
                            font-family:{T.fontSans};font-size:13px;font-weight:540;
                        "
                    >
                        Browse all
                        <Icon name="chevronRight" size={14} stroke={T.ink} />
                    </button>
                </div>
            </div>
        {/if}

        <!-- Filter tabs -->
        <div style="display:flex;align-items:center;gap:6px;margin-top:16px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;">
            {#each tabItems as t}
                {@const active = selectedTab === t.id}
                <button
                    onclick={() => selectedTab = t.id}
                    style="
                        padding:8px 14px;border-radius:9999px;flex:0 0 auto;cursor:pointer;
                        background:{active ? T.ink : T.surface};
                        color:{active ? '#fff' : T.inkBody};
                        border:{active ? 'none' : `1px solid ${T.hairline}`};
                        font-family:{T.fontSans};font-size:12.5px;font-weight:580;
                        display:inline-flex;align-items:center;gap:6px;
                    "
                >
                    {t.label}
                    {#if t.count != null}
                        <span style="font-size:11px;font-weight:580;font-variant-numeric:tabular-nums;opacity:{active ? 0.7 : 0.55};">{t.count}</span>
                    {/if}
                </button>
            {/each}
        </div>

        <!-- Body -->
        <div style="margin-top:14px;">
            {#if selectedTab === 'yours'}
                {#if !ownerAddress}
                    <div style="background:{T.surface};border-radius:18px;border:1px solid {T.hairlineSoft};padding:24px 16px;text-align:center;">
                        <span style="font-size:13.5px;color:{T.inkMuted};">Connect an avatar to see the groups you own.</span>
                    </div>
                {:else if ownedGroupsLoading}
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {#each Array(3) as _, i (i)}
                            <div style="border-radius:18px;background:{T.pageDeep};height:160px;" class="animate-pulse"></div>
                        {/each}
                    </div>
                {:else if ownedGroupsError}
                    <p style="font-size:13.5px;color:{T.negative};">{ownedGroupsError}</p>
                {:else if ownedGroups.length > 0}
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {#each ownedGroups as item, i (item.group)}
                            <GroupCard {item} variant="owned" gradientIndex={i} />
                        {/each}
                    </div>
                {/if}

            {:else if selectedTab === 'memberships'}
                {#if !ownerAddress}
                    <div style="background:{T.surface};border-radius:18px;border:1px solid {T.hairlineSoft};padding:24px 16px;text-align:center;">
                        <span style="font-size:13.5px;color:{T.inkMuted};">Connect an avatar to see the groups you are a member in.</span>
                    </div>
                {:else if membershipsLoading}
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {#each Array(3) as _, i (i)}
                            <div style="border-radius:18px;background:{T.pageDeep};height:160px;" class="animate-pulse"></div>
                        {/each}
                    </div>
                {:else if membershipsError}
                    <p style="font-size:13.5px;color:{T.negative};">{membershipsError}</p>
                {:else if memberships.length === 0}
                    <div style="background:{T.surface};border-radius:18px;border:1px solid {T.hairlineSoft};padding:24px 16px;text-align:center;">
                        <span style="font-size:13.5px;color:{T.inkMuted};">No group memberships</span>
                    </div>
                {:else}
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {#each memberships as item, i (item.group)}
                            <GroupCard {item} variant="member" gradientIndex={i} />
                        {/each}
                    </div>
                {/if}

            {:else}
                {#if groups}
                    <div
                        data-groups-list-scope
                        bind:this={allGroupsListScopeEl}
                        style="background:{T.surface};border-radius:18px;border:1px solid {T.hairlineSoft};overflow:hidden;box-shadow:{T.shadow.xs};"
                    >
                        <GenericList
                            store={groups}
                            row={GroupRowView}
                            rowHeight={64}
                            maxPlaceholderPages={2}
                            expectedPageSize={25}
                            placeholderRow={AvatarRowPlaceholder}
                        />
                    </div>
                {:else}
                    <div style="background:{T.surface};border-radius:18px;border:1px solid {T.hairlineSoft};overflow:hidden;box-shadow:{T.shadow.xs};">
                        {#each Array(4) as _, i (i)}
                            <AvatarRowPlaceholder />
                        {/each}
                    </div>
                {/if}
            {/if}
        </div>

        <div style="height:24px;"></div>
    </div>
</div>
