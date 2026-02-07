<script lang="ts">
    import {contacts} from '$lib/stores/contacts';
    import Papa from 'papaparse';
    import GenericList from '$lib/components/GenericList.svelte';
    import ContactRow from './ContactRow.svelte';
    import {derived, writable, type Writable} from 'svelte/store';
    import Filter from '$lib/components/Filter.svelte';
    import AddressInput from '$lib/components/AddressInput.svelte';
    import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
    import Lucide from '$lib/icons/Lucide.svelte';
    import {Filter as LFilter, Download as LDownload, Plus as LPlus, Star} from 'lucide';
    import {popupControls} from '$lib/stores/popup';
    import ManageGroupMembers from '$lib/flows/manageGroupMembers/1_manageGroupMembers.svelte';
    import {avatarState} from '$lib/stores/avatar.svelte';
    import ActionButtonBar from '$lib/components/layout/ActionButtonBar.svelte';
    import ActionButtonDropDown from '$lib/components/layout/ActionButtonDropDown.svelte';
    import type { Action } from '$lib/types/actions';
    import { goto } from '$app/navigation';
    import { createPaginatedList } from '$lib/stores/paginatedList';

    let filterVersion = writable<number | undefined>(undefined);
    let filterRelation = writable<'mutuallyTrusts' | 'trusts' | 'trustedBy' | 'variesByVersion' | undefined>(undefined);
    let searchQuery = writable<string>('');

    // Filters panel state — store to ensure reactivity in all modes
    const showFilters: Writable<boolean> = writable(false);
    const FILTER_PANEL_ID: string = 'contacts-filters';

    function toggleFilters(): void {
        showFilters.update((v) => !v);
    }

    // Build the full filtered array (not paginated)
    const filteredAll = derived(
        [contacts, filterVersion, filterRelation],
        ([$contacts, $filterVersion, $filterRelation]) => {
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
                    contact,
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
    const contactsPaginated = createPaginatedList(searchedAll, { pageSize: 25 });

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
        popupControls.open({
            title: avatarState.isGroup ? 'Add Member' : 'Add Contact',
            component: ManageGroupMembers,
            props: {}
        });
    }

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
        headerTopGapClass="mt-4 md:mt-6"
        collapsedTopGapClass="mt-3 md:mt-4"
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
                    <Lucide icon={LFilter} size={16} class="shrink-0 stroke-black" ariaLabel=""/>
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
                        <p class="text-sm">Relation</p>
                        <Filter text="All" filter={filterRelation} value={undefined}/>
                        <Filter text="Mutual" filter={filterRelation} value={'mutuallyTrusts'}/>
                        <Filter text="Trusted" filter={filterRelation} value={'trusts'}/>
                        <Filter text="Trust you" filter={filterRelation} value={'trustedBy'}/>
                        <Filter text="Varies by version" filter={filterRelation} value={'variesByVersion'}/>
                    </div>
                    <div class="flex-grow flex justify-end">
                        <button class="mt-4 sm:mt-0" onclick={handleExportCSV}>Export CSV</button>
                    </div>
                </div>
            {/if}
        </div>
    {/if}

    <AddressInput bind:address={$searchQuery}/>

    <GenericList store={contactsPaginated} row={ContactRow} rowHeight={64} maxPlaceholderPages={0} expectedPageSize={25} />
</PageScaffold>
