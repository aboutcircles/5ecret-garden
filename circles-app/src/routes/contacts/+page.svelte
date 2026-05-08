<script lang="ts">
    import { browser } from '$app/environment';
    import {contacts} from '$lib/shared/state/contacts';
    import Papa from 'papaparse';
    import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
    import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
    import ContactRow from './ContactRow.svelte';
    import AvatarRowPlaceholder from '$lib/shared/ui/lists/placeholders/AvatarRowPlaceholder.svelte';
    import {derived, writable, type Writable} from 'svelte/store';
    import Filter from '$lib/shared/ui/lists/Filter.svelte';
    import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
    import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
    import {Filter as LFilter, Download as LDownload, Plus as LPlus, Star} from 'lucide';
    import { popupControls } from '$lib/shared/state/popup';
    import {avatarState} from '$lib/shared/state/avatar.svelte';
    import { openAddTrustFlow } from '$lib/areas/trust/flows/addTrust/openAddTrustFlow';
    import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
    import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
    import type { Action } from '$lib/shared/ui/shell/actions';
    import { goto } from '$app/navigation';
    import { createPaginatedList } from '$lib/shared/state/paginatedList';
    import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';
    import HelpPopover from '$lib/shared/ui/primitives/HelpPopover.svelte';
    import { getProfilesCoreBatch } from '$lib/shared/model/profile/coreRepo';

    const CONTACTS_PAGE_SIZE = 25;
    const CONTACTS_VISIBLE_COUNT_KEY = 'contacts:list:visible-count';

    function getInitialPageCount(): number {
        if (!browser) return 1;
        const raw = Number(window.sessionStorage.getItem(CONTACTS_VISIBLE_COUNT_KEY) ?? '0');
        if (!Number.isFinite(raw) || raw <= 0) return 1;
        return Math.max(1, Math.ceil(raw / CONTACTS_PAGE_SIZE));
    }

    let filterVersion = writable<number | undefined>(undefined);
    let filterRelation = writable<'mutuallyTrusts' | 'trusts' | 'trustedBy' | 'variesByVersion' | undefined>(undefined);
    let searchQuery = writable<string>('');
    let contactsListScopeEl: HTMLDivElement | null = $state(null);

    // Filters panel state — store to ensure reactivity in all modes
    const showFilters: Writable<boolean> = writable(false);
    const FILTER_PANEL_ID: string = 'contacts-filters';

    function toggleFilters(): void {
        showFilters.update((v) => !v);
    }

    const profileCoreCache = writable(new Map<string, any>());
    const inflightProfileRequests = new Set<string>();

    async function preloadProfileCores(addresses: string[]) {
        if (addresses.length === 0) return;

        const normalized = addresses.map((addr) => addr.toLowerCase());
        const cacheSnapshot = $profileCoreCache;
        const missing = normalized.filter((addr) => !cacheSnapshot.has(addr) && !inflightProfileRequests.has(addr));

        if (missing.length === 0) return;

        missing.forEach((addr) => inflightProfileRequests.add(addr));
        try {
            const map = await getProfilesCoreBatch(missing as any);
            profileCoreCache.update((prev) => {
                const next = new Map(prev);
                for (const [addr, profile] of map.entries()) {
                    next.set(addr.toLowerCase(), profile);
                }
                return next;
            });
        } catch (e) {
            console.debug('[contacts] failed to preload profiles', e);
        } finally {
            missing.forEach((addr) => inflightProfileRequests.delete(addr));
        }
    }

    // Build the full filtered array (not paginated)
    const filteredAll = derived(
        [contacts, filterVersion, filterRelation, profileCoreCache],
        ([$contacts, $filterVersion, $filterRelation, $profileCache]) => {
            return Object.entries($contacts.data)
                .filter(([_, contact]) => {
                    if (avatarState.isGroup) {
                        return contact.row.relation === 'trusts';
                    }
                    const matchesVersion = !$filterVersion || contact?.avatarInfo?.version === $filterVersion;
                    const matchesRelation = !$filterRelation || contact?.row?.relation === $filterRelation;
                    return matchesVersion && matchesRelation;
                })
                .sort((a, b) => {
                    const aRelation = a[1].row.relation;
                    const bRelation = b[1].row.relation;
                    if (aRelation === 'mutuallyTrusts' && bRelation !== 'mutuallyTrusts') return -1;
                    if (aRelation === 'trusts' && bRelation === 'trustedBy') return -1;
                    if (bRelation === 'mutuallyTrusts' && aRelation !== 'mutuallyTrusts') return 1;
                    if (bRelation === 'trusts' && aRelation === 'trustedBy') return 1;
                    return 0;
                })
                .map(([address, contact]) => ({
                    blockNumber: Date.now(),
                    transactionIndex: 0,
                    logIndex: 0,
                    address,
                    contact: {
                        ...contact,
                        contactProfile: contact?.contactProfile ?? $profileCache.get(address.toLowerCase()),
                    },
                }));
        }
    );

    // Apply search on top of filtered
    const searchedAll = derived([filteredAll, searchQuery], ([$filteredAll, $searchQuery]) => {
        const q = ($searchQuery ?? '').toLowerCase();
        if (!q) return $filteredAll;
        return $filteredAll.filter((item) => {
            const name = item.contact?.contactProfile?.name?.toLowerCase?.() ?? '';
            return item.address.toLowerCase().includes(q) || name.includes(q);
        });
    });

    // Paginate searched results for rendering
    const contactsPaginated = createPaginatedList(searchedAll, {
        pageSize: CONTACTS_PAGE_SIZE,
        initialPageCount: getInitialPageCount(),
    });
    const contactsPaginatedWithEnd = derived([contactsPaginated, contacts], ([$paginated, $contacts]) => {
        const hasData = ($paginated?.data ?? []).length > 0;
        const showEnded = hasData
            ? $paginated.ended
            : ($contacts?.ended ?? false);
        return {
            ...$paginated,
            ended: showEnded,
        };
    });

    $effect(() => {
        if (!browser) return;
        const loadedCount = $contactsPaginatedWithEnd?.data?.length ?? 0;
        if (loadedCount > 0) {
            window.sessionStorage.setItem(CONTACTS_VISIBLE_COUNT_KEY, String(loadedCount));
        }
    });

    $effect(() => {
        const addresses = $searchedAll.slice(0, 100).map((item) => item.address);
        void preloadProfileCores(addresses);
    });

    const onSearchInputKeydown = createListInputArrowDownHandler({
        getScope: () => contactsListScopeEl,
        rowSelector: '[data-contact-row]'
    });

    async function handleExportCSV(): Promise<void> {
        // Export uses full filtered set (ignores pagination and current search)
        const csvData = $filteredAll.map((item) => ({
            address: item.address,
            name: item.contact?.contactProfile.name,
        }));
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `members-${$filterRelation || 'all'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function openAddContact() {
        if (!avatarState.avatar) {
            throw new Error('Avatar store not available');
        }

        openAddTrustFlow({
            context: {
                actorType: avatarState.isGroup ? 'group' : 'avatar',
                actorAddress: avatarState.avatar.address,
                selectedTrustees: [],
            },
        });
    }

    // Trust relation counts (unfiltered, for chips)
    const trustCounts = derived(contacts, ($c) => {
        const entries = Object.values($c?.data ?? {}) as any[];
        return {
            total: entries.length,
            mutual: entries.filter(e => e.row?.relation === 'mutuallyTrusts').length,
            trustedBy: entries.filter(e => e.row?.relation === 'trustedBy').length,
            trusts: entries.filter(e => e.row?.relation === 'trusts').length,
            varies: entries.filter(e => e.row?.relation === 'variesByVersion').length,
        };
    });

    // Dynamic labels for group context
    let titleText: string = $derived(avatarState.isGroup ? 'Members' : 'Contacts');
    let countLabel: string = $derived(avatarState.isGroup ? 'members' : 'entries');
    let addLabel: string = $derived(avatarState.isGroup ? 'Add Member' : 'Add Contact');

    // Keep actions lean: filter moved next to the title
    const actions: Action[] = $derived([
        {id: 'add', label: addLabel, iconNode: LPlus, onClick: openAddContact, variant: 'primary'},
        {id: 'bookmarks-settings', label: 'Bookmarks', iconNode: Star, onClick: () => goto('/settings?tab=bookmarks'), variant: 'ghost'},
        {id: 'export', label: 'Export CSV', iconNode: LDownload, onClick: handleExportCSV, variant: 'ghost'},
    ]);
</script>

<PageScaffold
        highlight="soft"
        collapsedMode="bar"
        collapsedHeightClass="h-12"
        maxWidthClass="page page--lg"
        contentWidthClass="page page--lg"
        usePagePadding={true}
>
    {#snippet title()}
        <div class="flex items-center gap-2">
            <h1 class="h2 m-0">{titleText}</h1>
            {#if !avatarState.isGroup}
                <button
                        type="button"
                        class="btn btn-ghost btn-xs p-1"
                        aria-label={$showFilters ? 'Hide filters' : 'Show filters'}
                        aria-expanded={$showFilters}
                        aria-controls={FILTER_PANEL_ID}
                        onclick={toggleFilters}
                        title="Filter"
                >
                    <Lucide icon={LFilter} size={16} class="shrink-0" ariaLabel=""/>
                </button>
            {/if}
        </div>
    {/snippet}

    {#snippet meta()}
        {$filteredAll.length} {countLabel}
    {/snippet}

    {#snippet headerActions()}
        <ActionButtonBar {actions} />
    {/snippet}

    {#snippet collapsedLeft()}
        <div class="truncate flex items-center gap-2">
            <span class="font-medium">{titleText}</span>
            <span class="text-sm text-base-content/60">{$filteredAll.length} {countLabel}</span>
        </div>
    {/snippet}

    {#snippet collapsedMenu()}
        <ActionButtonDropDown {actions} />
    {/snippet}

    {#if $showFilters}
        <div id={FILTER_PANEL_ID} class="mt-3  mb-3 space-y-3">
            {#if !avatarState.isGroup}
                <div class="flex gap-x-2 items-center flex-wrap">
                    <p class="text-sm">Version</p>
                    <Filter text="All" filter={filterVersion} value={undefined}/>
                    <Filter text="Version 1" filter={filterVersion} value={1}/>
                    <Filter text="Version 2" filter={filterVersion} value={2}/>
                </div>
                <div class="flex justify-between items-center flex-wrap gap-y-4">
                    <div class="flex gap-2 items-center flex-wrap">
                        <div class="flex items-center gap-1">
                            <p class="text-sm">Relation</p>
                            <HelpPopover
                                    title="Trust relations"
                                    lines={[
                                        'You accept = you accept their Circles.',
                                        'Accepts you = they accept your Circles.',
                                        'Both accept = you accept each other’s Circles.',
                                    ]}
                                    buttonClass="btn btn-ghost btn-xs btn-square"
                                    widthClass="w-72"
                            />
                        </div>

                        <Filter text="All" filter={filterRelation} value={undefined}/>
                        <Filter text="Both accept" filter={filterRelation} value={'mutuallyTrusts'}/>
                        <Filter text="You accept" filter={filterRelation} value={'trusts'}/>
                        <Filter text="Accepts you" filter={filterRelation} value={'trustedBy'}/>
                        <Filter text="Varies by version" filter={filterRelation} value={'variesByVersion'}/>
                    </div>
                    <div class="flex-grow flex justify-end">
                        <button class="mt-4 sm:mt-0" onclick={handleExportCSV}>Export CSV</button>
                    </div>
                </div>

                <p class="text-xs text-base-content/70">
                    Trust decides which Circles you accept — and whether payments can route through your connections.
                </p>
            {/if}

        </div>
    {/if}

    <!-- Trust relation chips (non-group only) -->
    {#if !avatarState.isGroup}
        <div class="flex gap-2 overflow-x-auto pb-1 mb-3 -mx-0.5 px-0.5" style="scrollbar-width:none;">
            {#each [
                { key: undefined,            label: 'All',         count: $trustCounts.total,    bg: '#F6F5F2',  color: 'rgba(15,10,30,0.70)', activeBg: '#5849D4', activeColor: '#fff' },
                { key: 'mutuallyTrusts',     label: 'Both accept', count: $trustCounts.mutual,   bg: '#F6F5F2',  color: 'rgba(15,10,30,0.70)', activeBg: '#DCEBDF', activeColor: '#2D8A52' },
                { key: 'trustedBy',          label: 'Accepts you', count: $trustCounts.trustedBy, bg: '#F6F5F2', color: 'rgba(15,10,30,0.70)', activeBg: '#EEEBFA', activeColor: '#5849D4' },
                { key: 'trusts',             label: 'You accept',  count: $trustCounts.trusts,   bg: '#F6F5F2',  color: 'rgba(15,10,30,0.70)', activeBg: '#FBEFCB', activeColor: '#B07014' },
            ] as chip}
                {#if chip.count > 0 || chip.key === undefined}
                    {@const isActive = $filterRelation === chip.key}
                    <button
                        type="button"
                        class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border-0 cursor-pointer transition-all"
                        style={isActive
                            ? `background:${chip.activeBg};color:${chip.activeColor};`
                            : `background:${chip.bg};color:${chip.color};`}
                        onclick={() => filterRelation.set(chip.key as any)}
                    >
                        {chip.label}
                        {#if chip.count > 0}
                            <span class="opacity-60 font-normal">{chip.count}</span>
                        {/if}
                    </button>
                {/if}
            {/each}
        </div>
    {/if}

    <ListShell
        query={searchQuery}
        searchPlaceholder="Search by address or name"
        inputDataAttribute="data-contacts-search-input"
        onInputKeydown={onSearchInputKeydown}
        isEmpty={$filteredAll.length === 0}
        ended={$contacts?.ended ?? false}
        emptyRequiresEnd={true}
        isNoMatches={$filteredAll.length > 0 && $searchedAll.length === 0}
        emptyLabel={avatarState.isGroup ? 'No members' : 'No contacts'}
        noMatchesLabel="No matches"
        wrapInListContainer={false}
    >
        <div data-contacts-list-scope bind:this={contactsListScopeEl}>
            <GenericList
                store={contactsPaginatedWithEnd}
                row={ContactRow}
                rowHeight={64}
                maxPlaceholderPages={2}
                expectedPageSize={25}
                placeholderRow={AvatarRowPlaceholder}
            />
        </div>
    </ListShell>
</PageScaffold>
