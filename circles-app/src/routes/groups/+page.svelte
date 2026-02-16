<script lang="ts">
    import { derived, readable, writable, type Readable } from 'svelte/store';
    import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
    import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
    import {createCMGroups} from '$lib/areas/groups/state';
    import type {EventRow} from '@circles-sdk/data';
    import GroupRowView from './GroupRowView.svelte';
    import OwnedGroupRowView from './OwnedGroupRowView.svelte';
    import {avatarState} from '$lib/shared/state/avatar.svelte';
    import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
    import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
    import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
    import type { Action } from '$lib/shared/ui/shell/actions';
    import {openFlowPopup} from '$lib/shared/state/popup';
    import CreateGroup from '$lib/areas/groups/flows/createGroup/1_CreateGroup.svelte';
    import GroupTabPanel from '$lib/areas/groups/ui/components/GroupTabPanel.svelte';
    import {resetCreateGroupContext} from '$lib/areas/groups/flows/createGroup/context';
    import {circles} from '$lib/shared/state/circles';
    import {CirclesStorage} from '$lib/shared/utils/storage';
    import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/shared/utils/getGroupsByOwnerBatch';
    import { getGroupsByMember } from '$lib/areas/groups/utils/getGroupsByMemberBatch';
    import type { GroupRow } from '@circles-sdk/data';
    import Tabs from '$lib/shared/ui/primitives/tabs/Tabs.svelte';
    import Tab from '$lib/shared/ui/primitives/tabs/Tab.svelte';
    import { type TabIdOf } from '$lib/shared/ui/primitives/tabs/tabId';
    import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';

    let groups: Readable<{
        data: EventRow[];
        next: () => Promise<boolean>;
        ended: boolean;
    }> | undefined = $state();
    const allGroupsQuery = writable('');
    let allGroupsListScopeEl: HTMLDivElement | null = $state(null);

    const emptyGroupsStore = readable<{ data: EventRow[]; next: () => Promise<boolean>; ended: boolean }>({
        data: [],
        next: async () => true,
        ended: true,
    });
    let filteredAllGroupsStore = $state<Readable<{ data: EventRow[]; next: () => Promise<boolean>; ended: boolean }>>(emptyGroupsStore);

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
        const base = groups;
        if (!base) {
            filteredAllGroupsStore = emptyGroupsStore;
            return;
        }

        const next = derived([base, allGroupsQuery], ([$base, $query]) => {
            const q = ($query ?? '').toLowerCase().trim();
            const rows = ($base?.data ?? []) as GroupRow[];
            const data = q.length === 0
                ? rows
                : rows.filter((item) => String(item.group ?? '').toLowerCase().includes(q));

            return {
                ...$base,
                data,
            };
        });

        filteredAllGroupsStore = next;
    });

    const onAllGroupsSearchInputKeydown = createListInputArrowDownHandler({
        getScope: () => allGroupsListScopeEl,
        rowSelector: '[data-group-row]'
    });

    $effect(() => {
        // Load whenever SDK or owner changes
        void loadOwnedGroups();
        void loadMemberships();
    });

    $effect(() => {
        const availableTabs: TabId[] = ['yours'];
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
              usePagePadding={true}
              headerTopGapClass="mt-4 md:mt-6"
              collapsedTopGapClass="mt-3 md:mt-4">
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

    <div class="flex flex-col items-center rounded-md px-3 py-4 md:px-4 md:py-5 gap-y-3">
        <div class="w-full">
            <Tabs bind:selected={selectedTab} variant="boxed" size="sm" tabOrder={TAB_IDS as unknown as string[]}>
                <Tab id="yours" title="My groups" />
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
                    {#snippet empty()}
                        <div class="rounded-xl border border-dashed border-base-300 bg-base-200/40 p-4 space-y-3">
                            <div>
                                <p class="text-sm font-semibold text-base-content">No groups yet</p>
                                <p class="text-sm text-base-content/70">
                                    Create a group to start coordinating with others, or explore existing groups.
                                </p>
                            </div>
                            <div class="flex flex-wrap gap-4 text-sm">
                                <a
                                    href="/groups"
                                    class="link link-primary"
                                    onclick={(event) => {
                                        event.preventDefault();
                                        selectedTab = 'all';
                                    }}
                                >
                                    Browse all groups
                                </a>
                                <a
                                    href="/groups#create"
                                    class="link link-primary"
                                    class:opacity-50={!canCreateGroup}
                                    class:pointer-events-none={!canCreateGroup}
                                    aria-disabled={!canCreateGroup}
                                    onclick={(event) => {
                                        event.preventDefault();
                                        if (!canCreateGroup) return;
                                        void openCreateGroup();
                                    }}
                                >
                                    Create a group
                                </a>
                            </div>
                        </div>
                    {/snippet}
                    {#each items as item (item.group)}
                        <OwnedGroupRowView item={item as GroupRow} />
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
                        <GroupRowView item={item as GroupRow} />
                    {/each}
                </GroupTabPanel>
            {:else}
                {#if groups}
                    <div data-groups-list-scope bind:this={allGroupsListScopeEl}>
                        <ListShell
                            query={allGroupsQuery}
                            searchPlaceholder="Search by group address"
                            inputDataAttribute="data-groups-search-input"
                            onInputKeydown={onAllGroupsSearchInputKeydown}
                            isEmpty={$groups?.data.length === 0}
                            isNoMatches={$groups?.data.length > 0 && $filteredAllGroupsStore.data.length === 0}
                            emptyLabel="No groups found"
                            noMatchesLabel="No matching groups"
                            wrapInListContainer={false}
                        >
                            <GenericList
                                store={filteredAllGroupsStore}
                                row={GroupRowView}
                                rowHeight={64}
                                maxPlaceholderPages={0}
                                expectedPageSize={25}
                            />
                        </ListShell>
                    </div>
                {:else}
                    <div class="text-sm opacity-70">Loading…</div>
                {/if}
            {/if}
        </div>
    </div>
</PageScaffold>
