<script lang="ts">
    import { contacts } from '$lib/stores/contacts';
    import Papa from 'papaparse';
    import GenericList from '$lib/components/GenericList.svelte';
    import ContactRow from './ContactRow.svelte';
    import { derived, writable, type Writable } from 'svelte/store';
    import Filter from '$lib/components/Filter.svelte';
    import AddressInput from '$lib/components/AddressInput.svelte';
    import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
    import Lucide from '$lib/icons/Lucide.svelte';
    import { Filter as LFilter, Download as LDownload, Plus as LPlus } from 'lucide';
    import { popupControls } from '$lib/stores/popUp';
    import ManageGroupMembers from '$lib/flows/manageGroupMembers/1_manageGroupMembers.svelte';

    let filterVersion = writable<number | undefined>(undefined);
    let filterRelation = writable<'mutuallyTrusts' | 'trusts' | 'trustedBy' | 'variesByVersion' | undefined>(undefined);
    let searchQuery = writable<string>('');

    // Filters panel state — store to ensure reactivity in all modes
    const showFilters: Writable<boolean> = writable(false);
    const FILTER_PANEL_ID: string = 'contacts-filters';

    function toggleFilters(): void {
        showFilters.update((v) => !v);
    }

    let filteredStore = derived(
        [contacts, filterVersion, filterRelation],
        ([$contacts, filterVersion, filterRelation]) => {
            const filteredData = Object.entries($contacts.data)
                .filter(([_, contact]) => {
                    const matchesVersion = !filterVersion || contact?.avatarInfo?.version === filterVersion;
                    const matchesRelation = !filterRelation || contact?.row?.relation === filterRelation;
                    return matchesVersion && matchesRelation;
                })
                .sort((a, b) => {
                    const aRelation = a[1].row.relation;
                    const bRelation = b[1].row.relation;
                    if (aRelation === 'mutuallyTrusts' && bRelation !== 'mutuallyTrusts') { return -1; }
                    if (aRelation === 'trusts' && bRelation === 'trustedBy') { return -1; }
                    if (aRelation === bRelation) { return 0; }
                    if (bRelation === 'mutuallyTrusts' && aRelation !== 'mutuallyTrusts') { return 1; }
                    if (bRelation === 'trusts' && aRelation === 'trustedBy') { return 1; }
                    return 0;
                })
                .map(([address, contact]) => ({
                    blockNumber: Date.now(),
                    transactionIndex: 0,
                    logIndex: 0,
                    address,
                    contact,
                }));

            return {
                data: filteredData,
                next: $contacts.next,
                ended: $contacts.ended,
            };
        }
    );

    let searchedStore = derived(
        [filteredStore, searchQuery],
        ([$filteredStore, searchQuery]) => {
            let results = $filteredStore.data.filter((item) => {
                const name = item.contact?.contactProfile.name || '';
                const addressMatches = item.address.toLowerCase().includes(searchQuery.toLowerCase());
                const nameMatches = name.toLowerCase().includes(searchQuery.toLowerCase());
                return addressMatches || nameMatches;
            });

            if (results.length === 0) {
                results = [];
            }

            return {
                data: results,
                next: $filteredStore.next,
                ended: $filteredStore.ended,
            };
        }
    );

    async function handleExportCSV(): Promise<void> {
        const csvData = $filteredStore.data.map((item) => ({
            address: item.address,
            name: item.contact?.contactProfile.name,
        }));
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `members-${$filterRelation || 'all'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function openAddContact() {
        popupControls.open({ title: 'Add Contact', component: ManageGroupMembers, props: {} });
    }

    type Action = { id: string; label: string; iconNode: any; onClick: () => void; variant: 'primary'|'ghost'; disabled?: boolean };

    const actions: Action[] = [
        { id: 'add', label: 'Add Contact', iconNode: LPlus, onClick: openAddContact, variant: 'primary' },
        { id: 'filter', label: 'Filter', iconNode: LFilter, onClick: toggleFilters, variant: 'ghost' },
        { id: 'export', label: 'Export CSV', iconNode: LDownload, onClick: handleExportCSV, variant: 'ghost' },
    ];
</script>

<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true} headerTopGapClass="mt-4 md:mt-6" collapsedTopGapClass="mt-3 md:mt-4">
    <svelte:fragment slot="title">
        <h1 class="h2 m-0">Contacts</h1>
    </svelte:fragment>
    <svelte:fragment slot="meta">
        {$filteredStore.data.length} entries
    </svelte:fragment>
    <svelte:fragment slot="actions">
        {#each actions as a (a.id)}
            <button type="button" class={`btn btn-sm ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`} on:click={a.onClick} aria-label={a.label}>
                <Lucide icon={a.iconNode} size={16} class={a.variant === 'primary' ? 'shrink-0 stroke-white' : 'shrink-0 stroke-black'} />
                <span>{a.label}</span>
            </button>
        {/each}
    </svelte:fragment>

    <svelte:fragment slot="collapsed-left">
        <div class="truncate flex items-center gap-2">
            <span class="font-medium">Contacts</span>
            <span class="text-sm text-base-content/60">{$filteredStore.data.length} entries</span>
        </div>
    </svelte:fragment>

    <svelte:fragment slot="collapsed-menu">
        {#each actions as a (a.id)}
            <button type="button" class={`btn btn-ghost btn-sm w-full justify-start`} on:click={a.onClick} aria-label={a.label}>
                <Lucide icon={a.iconNode} size={16} class="shrink-0 stroke-black" />
                <span>{a.label}</span>
            </button>
        {/each}
    </svelte:fragment>

    {#if $showFilters}
        <div id={FILTER_PANEL_ID} class="mt-3 space-y-3">
            <div class="flex gap-x-2 items-center flex-wrap">
                <p class="text-sm">Version</p>
                <Filter text="All" filter={filterVersion} value={undefined} />
                <Filter text="Version 1" filter={filterVersion} value={1} />
                <Filter text="Version 2" filter={filterVersion} value={2} />
            </div>

            <div class="flex justify-between items-center flex-wrap gap-y-4">
                <div class="flex gap-2 items-center flex-wrap">
                    <p class="text-sm">Relation</p>
                    <Filter text="All" filter={filterRelation} value={undefined} />
                    <Filter text="Mutual" filter={filterRelation} value={'mutuallyTrusts'} />
                    <Filter text="Trusted" filter={filterRelation} value={'trusts'} />
                    <Filter text="Trust you" filter={filterRelation} value={'trustedBy'} />
                    <Filter text="Varies by version" filter={filterRelation} value={'variesByVersion'} />
                </div>
                <div class="flex-grow flex justify-end">
                    <button class="mt-4 sm:mt-0" on:click={handleExportCSV}>Export CSV</button>
                </div>
            </div>
        </div>
    {/if}

    <AddressInput bind:address={$searchQuery} />

    <GenericList store={searchedStore} row={ContactRow} />
</PageScaffold>
