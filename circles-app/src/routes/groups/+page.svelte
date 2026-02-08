<script lang="ts">
    import GenericList from '$lib/components/GenericList.svelte';
    import {createCMGroups} from '$lib/domains/groups/state';
    import type {Readable} from 'svelte/store';
    import type {EventRow} from '@circles-sdk/data';
    import GroupRowView from './GroupRowView.svelte';
    import {avatarState} from '$lib/shared/state/avatar.svelte';
    import PageScaffold from '$lib/app/shell/PageScaffold.svelte';
    import ActionButtonBar from '$lib/app/shell/ActionButtonBar.svelte';
    import ActionButtonDropDown from '$lib/app/shell/ActionButtonDropDown.svelte';
    import type { Action } from '$lib/types/actions';
    import {popupControls} from '$lib/shared/state/popup';
    import CreateGroup from '$lib/flows/createGroup/1_CreateGroup.svelte';
    import GroupTabPanel from '$lib/components/groups/GroupTabPanel.svelte';
    import {resetCreateGroupContext} from '$lib/flows/createGroup/context';
    import {circles} from '$lib/shared/state/circles';
    import {CirclesStorage} from '$lib/utils/storage';
    import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/utils/getGroupsByOwnerBatch';
    import { getGroupsByMember } from '$lib/utils/getGroupsByMemberBatch';
    import type { GroupRow } from '@circles-sdk/data';
    import Tabs from '$lib/shared/ui/primitives/tabs/Tabs.svelte';
    import Tab from '$lib/shared/ui/primitives/tabs/Tab.svelte';
    import { type TabIdOf } from '$lib/shared/ui/primitives/tabs/tabId';

    let groups: Readable<{
        data: EventRow[];
        next: () => Promise<boolean>;
        ended: boolean;
    }> | undefined = $state();

    let ownedGroups: GroupRow[] = $state([]);
    let ownedGroupsLoading: boolean = $state(false);
    let ownedGroupsError: string | null = $state(null);

    let memberships: GroupRow[] = $state([]);
    let membershipsLoading: boolean = $state(false);
    let membershipsError: string | null = $state(null);

    const TAB_IDS = ['yours', 'memberships', 'all'] as const;
    type TabId = TabIdOf<typeof TAB_IDS>;

    let selectedTab: TabId = $state('yours');

    const hasOwnedGroups: boolean = $derived(ownedGroups.length > 0);
    const hasMemberships: boolean = $derived(memberships.length > 0);

    async function loadGroups(): Promise<void> {
        if (!avatarState.avatar) return;
        groups = await createCMGroups(avatarState.avatar);
    }

    const ownerAddress: string | undefined = $derived(
        (CirclesStorage.getInstance().avatar as string | undefined) ?? avatarState.avatar?.address
    );

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
        } catch (e) {
            membershipsError = e instanceof Error ? e.message : String(e);
            memberships = [];
        } finally {
            membershipsLoading = false;
        }
    }

    $effect(() => {
        if (avatarState.avatar) {
            loadGroups();
        }
    });

    $effect(() => {
        // Load whenever SDK or owner changes
        void loadOwnedGroups();
        void loadMemberships();
    });

    $effect(() => {
        const availableTabs: TabId[] = [];
        if (hasOwnedGroups) {
            availableTabs.push('yours');
        }
        if (hasMemberships) {
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

        popupControls.open({
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
              usePagePadding={true}
              headerTopGapClass="mt-4 md:mt-6"
              collapsedTopGapClass="mt-3 md:mt-4">
    {#snippet title()}
        <h1 class="h2">Groups</h1>
    {/snippet}
    {#snippet meta()}
        and Communities
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

    <div class="flex flex-col items-center rounded-md px-3 py-4 md:px-4 md:py-5 gap-y-3">
        <div class="w-full">
            <Tabs bind:selected={selectedTab} variant="boxed" size="sm">
                {#if hasOwnedGroups}
                    <Tab id="yours" title="My groups" />
                {/if}
                {#if hasMemberships}
                    <Tab id="memberships" title="Memberships" />
                {/if}
                <Tab id="all" title="All groups" />
            </Tabs>
        </div>

        <div class="flex flex-col w-full gap-y-4">
            {#if selectedTab === 'yours'}
                <GroupTabPanel
                    ownerAddress={ownerAddress}
                    loading={ownedGroupsLoading}
                    error={ownedGroupsError}
                    items={ownedGroups}
                    connectText="Connect an avatar to see the groups you own."
                    emptyText="No groups found."
                    let:items
                >
                    {#each items as item (item.group)}
                        <GroupRowView {item} />
                    {/each}
                </GroupTabPanel>
            {:else if selectedTab === 'memberships'}
                <GroupTabPanel
                    ownerAddress={ownerAddress}
                    loading={membershipsLoading}
                    error={membershipsError}
                    items={memberships}
                    connectText="Connect an avatar to see the groups you are a member in."
                    emptyText="No groups found."
                    let:items
                >
                    {#each items as item (item.group)}
                        <GroupRowView {item} />
                    {/each}
                </GroupTabPanel>
            {:else}
                {#if groups}
                    <GenericList
                        store={groups}
                        row={GroupRowView}
                        rowHeight={64}
                        maxPlaceholderPages={0}
                        expectedPageSize={25}
                    />
                {:else}
                    <div class="text-sm opacity-70">Loading…</div>
                {/if}
            {/if}
        </div>
    </div>
</PageScaffold>
