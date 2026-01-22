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
  import {
    Filter as LFilter,
    Download as LDownload,
    Plus as LPlus,
  } from 'lucide';
  import { popupControls } from '$lib/stores/popUp.svelte';
  import ManageGroupMembers from '$lib/flows/manageGroupMembers/1_manageGroupMembers.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  type FilterValue = 'mutuallyTrusts' | 'trusts' | 'trustedBy' | undefined;

  // Read initial values from URL
  function getInitialFilter(): FilterValue {
    const urlFilter = $page.url.searchParams.get('filter');
    if (urlFilter === 'mutual') return 'mutuallyTrusts';
    if (urlFilter === 'trusts') return 'trusts';
    if (urlFilter === 'trustedBy') return 'trustedBy';
    return undefined;
  }

  function getInitialSearch(): string {
    return $page.url.searchParams.get('q') || '';
  }

  let filterRelation = writable<FilterValue>(getInitialFilter());
  let searchQuery = writable<string>(getInitialSearch());

  // Sync state to URL
  function updateUrl(filter: FilterValue, query: string) {
    const url = new URL($page.url);

    // Map filter value to URL param
    if (filter === 'mutuallyTrusts') {
      url.searchParams.set('filter', 'mutual');
    } else if (filter === 'trusts') {
      url.searchParams.set('filter', 'trusts');
    } else if (filter === 'trustedBy') {
      url.searchParams.set('filter', 'trustedBy');
    } else {
      url.searchParams.delete('filter');
    }

    if (query) {
      url.searchParams.set('q', query);
    } else {
      url.searchParams.delete('q');
    }

    goto(url.toString(), { replaceState: true, keepFocus: true });
  }

  // Subscribe to store changes and sync to URL
  let isInitialized = false;
  onMount(() => {
    isInitialized = true;
  });

  // Sync filter changes to URL (after initial mount)
  $effect(() => {
    if (isInitialized) {
      const currentFilter = $filterRelation;
      const currentQuery = $searchQuery;
      updateUrl(currentFilter, currentQuery);
    }
  });

  // Filters panel state — store to ensure reactivity in all modes
  const showFilters: Writable<boolean> = writable(false);
  const FILTER_PANEL_ID: string = 'contacts-filters';

  function toggleFilters(): void {
    showFilters.update((v) => !v);
  }

  let filteredStore = derived(
    [contacts, filterRelation],
    ([$contacts, filterRelation]) => {
      const filteredData = Object.entries($contacts.data)
        .filter(([_, contact]) => {
          if (avatarState.isGroup) {
            return contact.row.relation === 'trusts';
          }

          const matchesRelation =
            !filterRelation || contact?.row?.relation === filterRelation;
          return matchesRelation;
        })
        .sort((a, b) => {
          const aRelation = a[1].row.relation;
          const bRelation = b[1].row.relation;
          if (
            aRelation === 'mutuallyTrusts' &&
            bRelation !== 'mutuallyTrusts'
          ) {
            return -1;
          }
          if (aRelation === 'trusts' && bRelation === 'trustedBy') {
            return -1;
          }
          if (aRelation === bRelation) {
            return 0;
          }
          if (
            bRelation === 'mutuallyTrusts' &&
            aRelation !== 'mutuallyTrusts'
          ) {
            return 1;
          }
          if (bRelation === 'trusts' && aRelation === 'trustedBy') {
            return 1;
          }
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
        const addressMatches = item.address
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const nameMatches = name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
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
    popupControls.open({
      title: avatarState.isGroup ? 'Add Member' : 'Add Contact',
      component: ManageGroupMembers,
      props: {},
    });
  }

  // Dynamic labels for group context
  let titleText: string = $derived(
    avatarState.isGroup ? 'Members' : 'Contacts'
  );
  let countLabel: string = $derived(
    avatarState.isGroup ? 'members' : 'entries'
  );
  let addLabel: string = $derived(
    avatarState.isGroup ? 'Add Member' : 'Add Contact'
  );

  type Action = {
    id: string;
    label: string;
    iconNode: any;
    onClick: () => void;
    variant: 'primary' | 'ghost';
    disabled?: boolean;
  };

  // Keep actions lean: filter moved next to the title
  const actions: Action[] = [
    {
      id: 'add',
      label: addLabel,
      iconNode: LPlus,
      onClick: openAddContact,
      variant: 'primary',
    },
    {
      id: 'export',
      label: 'Export CSV',
      iconNode: LDownload,
      onClick: handleExportCSV,
      variant: 'ghost',
    },
  ];
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
  <svelte:fragment slot="title">
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
          <Lucide
            icon={LFilter}
            size={16}
            class="shrink-0 stroke-black"
            ariaLabel=""
          />
        </button>
      {/if}
    </div>
  </svelte:fragment>

  <svelte:fragment slot="meta">
    {$filteredStore.data.length}
    {countLabel}
  </svelte:fragment>

  <svelte:fragment slot="actions">
    {#each actions as a (a.id)}
      <button
        type="button"
        class={`btn btn-sm ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`}
        onclick={a.onClick}
        aria-label={a.label}
      >
        <Lucide
          icon={a.iconNode}
          size={16}
          class={a.variant === 'primary'
            ? 'shrink-0 stroke-white'
            : 'shrink-0 stroke-black'}
        />
        <span>{a.label}</span>
      </button>
    {/each}
  </svelte:fragment>

  <svelte:fragment slot="collapsed-left">
    <div class="truncate flex items-center gap-2">
      <span class="font-medium">{titleText}</span>
      <span class="text-sm text-base-content/60"
        >{$filteredStore.data.length} {countLabel}</span
      >
    </div>
  </svelte:fragment>

  <svelte:fragment slot="collapsed-menu">
    {#each actions as a (a.id)}
      <button
        type="button"
        class={`btn ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'} min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] w-full justify-start px-3`}
        onclick={a.onClick}
        aria-label={a.label}
      >
        <Lucide
          icon={a.iconNode}
          size={20}
          class={a.variant === 'primary'
            ? 'shrink-0 stroke-white'
            : 'shrink-0 stroke-black'}
        />
        <span>{a.label}</span>
      </button>
    {/each}
  </svelte:fragment>

  {#if $showFilters}
    <div id={FILTER_PANEL_ID} class="mt-3 mb-3 space-y-3">
      {#if !avatarState.isGroup}
        <div class="flex justify-between items-center flex-wrap gap-y-4">
          <div class="flex gap-2 items-center flex-wrap">
            <p class="text-sm">Relation</p>
            <Filter text="All" filter={filterRelation} value={undefined} />
            <Filter
              text="Mutual"
              filter={filterRelation}
              value={'mutuallyTrusts'}
            />
            <Filter text="Trusted" filter={filterRelation} value={'trusts'} />
            <Filter
              text="Trust you"
              filter={filterRelation}
              value={'trustedBy'}
            />
          </div>
          <div class="flex-grow flex justify-end">
            <button class="mt-4 sm:mt-0" onclick={handleExportCSV}
              >Export CSV</button
            >
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <AddressInput bind:address={$searchQuery} />

  <GenericList store={searchedStore} row={ContactRow} />
</PageScaffold>
