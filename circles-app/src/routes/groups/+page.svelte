        <script lang="ts">
    import { derived, readable, writable, type Readable } from 'svelte/store';
    import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
    import {createCMGroups} from '$lib/areas/groups/state';
    import type {EventRow} from '@circles-sdk/data';
    import GroupRowView from './GroupRowView.svelte';
    import AvatarRowPlaceholder from '$lib/shared/ui/lists/placeholders/AvatarRowPlaceholder.svelte';
    import OwnedGroupRowView from './OwnedGroupRowView.svelte';
    import {avatarState} from '$lib/shared/state/avatar.svelte';
    import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
    import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
    import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
    import type { Action } from '$lib/shared/ui/shell/actions';
    import {openFlowPopup} from '$lib/shared/state/popup';
    import CreateGroup from '$lib/areas/groups/flows/createGroup/1_CreateGroup.svelte';
    import GroupTabPanel from '$lib/areas/groups/ui/components/GroupTabPanel.svelte';
    import GroupCard from './GroupCard.svelte';
    import {resetCreateGroupContext} from '$lib/areas/groups/flows/createGroup/context';
    import {circles} from '$lib/shared/state/circles';
    import {CirclesStorage} from '$lib/shared/utils/storage';
    import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/shared/utils/getGroupsByOwnerBatch';
    import { getGroupsByMember } from '$lib/areas/groups/utils/getGroupsByMemberBatch';
    import type { GroupRow } from '@circles-sdk/data';
    import Tabs from '$lib/shared/ui/primitives/tabs/Tabs.svelte';
    import Tab from '$lib/shared/ui/primitives/tabs/Tab.svelte';
    import { type TabIdOf } from '$lib/shared/ui/primitives/tabs/tabId';

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

    const TAB_IDS = ['yours', 'memberships', 'all'] as const;
    type TabId = TabIdOf<typeof TAB_IDS>;

    const ownerAddress: string | undefined = $derived(
        (CirclesStorage.getInstance().avatar as string | undefined) ?? avatarState.avatar?.address
    );

    let selectedTab: TabId = $state('yours');
    let allGroupsLoadedForAvatar: string | null = $state(null);

    const canShowMembershipsTab: boolean = $derived(!!ownerAddress);

    async function loadGroups(): Promise<void> {
        if (!avatarState.avatar) return;
        groups = await createCMGroups(avatarState.avatar);
    }

    async function loadOwnedGroups(): Promise<void> {
        if (!$circles || !ownerAddress) {
            ownedGroups = [];
            ownedGroupsLoading = false;
            ownedGroupsError = null;
            return;
        }

        ownedGroupsLoading = true;
        ownedGroupsError = null;
        try {
            const result = await getBaseAndCmgGroupsByOwnerBatch($circles, [ownerAddress as any]);
            ownedGroups = result[(ownerAddress as string).toLowerCase() as any] ?? result[ownerAddress as any] ?? [];
            ownedGroupsLoadedForAvatar = String(ownerAddress).toLowerCase();
        } catch (e) {
            ownedGroupsError = e instanceof Error ? e.message : String(e);
            ownedGroups = [];
        } finally {
            ownedGroupsLoading = false;
        }
    }

    async function loadMemberships(): Promise<void> {
        if (!$circles || !ownerAddress) {
            memberships = [];
            membershipsLoading = false;
            membershipsError = null;
            return;
        }

        membershipsLoading = true;
        membershipsError = null;
        try {
            memberships = await getGroupsByMember($circles, ownerAddress as any);
            membershipsLoadedForAvatar = String(ownerAddress).toLowerCase();
        } catch (e) {
            membershipsError = e instanceof Error ? e.message : String(e);
            memberships = [];
        } finally {
            membershipsLoading = false;
        }
    }

    $effect(() => {
        const avatar = avatarState.avatar;
        if (!avatar) {
            groups = undefined;
            allGroupsLoadedForAvatar = null;
            return;
        }

        if (selectedTab !== 'all') {
            return;
        }

        const avatarKey = String(avatar.address).toLowerCase();
        if (allGroupsLoadedForAvatar === avatarKey && groups) {
            return;
        }

        allGroupsLoadedForAvatar = avatarKey;
        void loadGroups();
    });

    $effect(() => {
        if (!$circles || !ownerAddress) {
            ownedGroups = [];
            ownedGroupsError = null;
            ownedGroupsLoading = false;
            memberships = [];
            membershipsError = null;
            membershipsLoading = false;
            ownedGroupsLoadedForAvatar = null;
            membershipsLoadedForAvatar = null;
            return;
        }

        const ownerKey = String(ownerAddress).toLowerCase();
        if (ownedGroupsLoadedForAvatar !== ownerKey && !ownedGroupsLoading) {
            void loadOwnedGroups();
        }
    });

    $effect(() => {
        if (selectedTab !== 'memberships' || !$circles || !ownerAddress) {
            return;
        }

        const ownerKey = String(ownerAddress).toLowerCase();
        if (membershipsLoadedForAvatar === ownerKey || membershipsLoading) {
            return;
        }

        void loadMemberships();
    });

    $effect(() => {
        const availableTabs: TabId[] = ['yours'];
        if (canShowMembershipsTab) {
            availableTabs.push('memberships');
        }
        availableTabs.push('all');

        if (!availableTabs.includes(selectedTab)) {
            selectedTab = availableTabs[0];
        }
    });

    const canCreateGroup: boolean = $derived(!!$circles && !!CirclesStorage.getInstance().avatar);

    async function openCreateGroup(): Promise<void> {
        const safeAddress = CirclesStorage.getInstance().avatar;
        if (!$circles || !safeAddress) return;

        // Initialize a fresh context with feeCollection defaulted to this safe address
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
            // Ensure state is cleared if the user closes the flow
            onClose: () => resetCreateGroupContext()
        } as any);
    }

    const actions: Action[] = $derived([
        {
            id: 'create-group',
            label: 'Create group',
            onClick: openCreateGroup,
            variant: 'primary',
            disabled: !canCreateGroup,
        }
    ]);
</script>

<PageScaffold highlight="soft"
              collapsedMode="bar"
              collapsedHeightClass="h-12"
              maxWidthClass="page page--lg"
              contentWidthClass="page page--lg"
              usePagePadding={true}>
            {#snippet title()}
        <h1 class="h2">Groups</h1>
    {/snippet}
    {#snippet meta()}
        Groups and communities
    {/snippet}
    {#snippet headerActions()}
        <ActionButtonBar {actions}/>
    {/snippet}
    {#snippet collapsedLeft()}
  <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">
      Groups
  </span>
    {/snippet}
    {#snippet collapsedMenu()}
        <ActionButtonDropDown {actions}/>
    {/snippet}

    <div class="flex flex-col gap-y-3">
        <Tabs bind:selected={selectedTab} variant="boxed" size="sm" tabOrder={TAB_IDS as unknown as string[]}>
            <Tab id="yours" title="My groups" />
            {#if canShowMembershipsTab}
                <Tab id="memberships" title="Memberships" />
            {/if}
            <Tab id="all" title="All groups" />
        </Tabs>

        <div class="w-full">
            {#if selectedTab === 'yours'}
                {#if !ownerAddress}
                    <p class="text-sm opacity-70">Connect an avatar to see the groups you own.</p>
                {:else if ownedGroupsLoading}
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {#each Array(4) as _, i (i)}
                            <div class="rounded-[16px] bg-base-200 animate-pulse h-[120px]"></div>
                        {/each}
                    </div>
                {:else if ownedGroupsError}
                    <p class="text-sm text-error">{ownedGroupsError}</p>
                {:else if ownedGroups.length === 0}
                    <div class="rounded-xl border border-dashed border-base-300 bg-base-200/40 p-4 space-y-3">
                        <div>
                            <p class="text-sm font-semibold text-base-content">No groups yet</p>
                            <p class="text-sm text-base-content/70">
                                Create a group to start coordinating with others, or explore existing groups.
                            </p>
                        </div>
                        <div class="flex flex-wrap gap-4 text-sm">
                            <a href="/groups" class="link link-primary"
                               onclick={(e) => { e.preventDefault(); selectedTab = 'all'; }}>
                                Browse all groups
                            </a>
                            <a href="/groups#create" class="link link-primary"
                               class:opacity-50={!canCreateGroup}
                               class:pointer-events-none={!canCreateGroup}
                               aria-disabled={!canCreateGroup}
                               onclick={(e) => { e.preventDefault(); if (canCreateGroup) void openCreateGroup(); }}>
                                Create a group
                            </a>
                        </div>
                    </div>
                {:else}
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {#each ownedGroups as item, i (item.group)}
                            <GroupCard {item} variant="owned" gradientIndex={i} />
                        {/each}
                    </div>
                {/if}

            {:else if selectedTab === 'memberships'}
                {#if !ownerAddress}
                    <p class="text-sm opacity-70">Connect an avatar to see the groups you are a member in.</p>
                {:else if membershipsLoading}
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {#each Array(4) as _, i (i)}
                            <div class="rounded-[16px] bg-base-200 animate-pulse h-[120px]"></div>
                        {/each}
                    </div>
                {:else if membershipsError}
                    <p class="text-sm text-error">{membershipsError}</p>
                {:else if memberships.length === 0}
                    <p class="text-sm opacity-70 py-4 text-center">No group memberships</p>
                {:else}
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {#each memberships as item, i (item.group)}
                            <GroupCard {item} variant="member" gradientIndex={i} />
                        {/each}
                    </div>
                {/if}

            {:else}
                {#if groups}
                    <div data-groups-list-scope bind:this={allGroupsListScopeEl}>
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
                    <div class="text-sm opacity-70">Loading…</div>
                {/if}
            {/if}
        </div>
    </div>
</PageScaffold>
