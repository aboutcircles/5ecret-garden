<script lang="ts">
  import { contacts, type ContactListItem } from '$lib/stores/contacts';
  import { onMount } from 'svelte';
  import Papa from 'papaparse';
  import GenericList from '$lib/components/GenericList.svelte';
  import ContactRow from './ContactRow.svelte';
  import Filter from '$lib/components/Filter.svelte';
  import AddressInput from '$lib/components/AddressInput.svelte';
  import { readable } from 'svelte/store';

  type SearchResult = {
    blockNumber: number;
    transactionIndex: number;
    logIndex: number;
    address: string;
    contact: ContactListItem;
  };

  let filterVersion = $state<number | undefined>(undefined);
  let filterRelation = $state<
    'mutuallyTrusts' | 'trusts' | 'trustedBy' | 'variesByVersion' | undefined
  >(undefined);
  let searchQuery = $state('');

  let filtered = $derived.by(() => {
    const filteredData = Object.entries($contacts.data)
      .filter(
        ([_, contact]) =>
          (!filterVersion || contact?.avatarInfo?.version === filterVersion) &&
          (!filterRelation || contact?.row?.relation === filterRelation)
      )
      .sort((a, b) => {
        const aRelation = a[1].row.relation;
        const bRelation = b[1].row.relation;
        if (aRelation === 'mutuallyTrusts' && bRelation !== 'mutuallyTrusts')
          return -1;
        if (aRelation === 'trusts' && bRelation === 'trustedBy') return -1;
        if (aRelation === bRelation) return 0;
        if (bRelation === 'mutuallyTrusts' && aRelation !== 'mutuallyTrusts')
          return 1;
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

    return {
      data: filteredData,
      next: $contacts.next,
      ended: $contacts.ended,
    };
  });

  // --- Search filtering ---
  let searched = readable<{
    data: SearchResult[];
    next: () => Promise<boolean>;
    ended: boolean;
  }>(
    {
      data: [],
      next: async () => false,
      ended: true,
    },
    (set) => {
      $effect(() => {
        const results = filtered.data.filter((item) => {
          const name = item.contact?.contactProfile.name || '';
          return (
            item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
            name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        });

        set({
          data: results,
          next: filtered.next,
          ended: filtered.ended,
        });
      });

      return () => {};
    }
  );

  onMount(() => {
    const unsubscribe = contacts.subscribe(() => {});
    return unsubscribe;
  });

  async function handleExportCSV() {
    const csvData = filtered.data.map((item) => ({
      address: item.address,
      name: item.contact?.contactProfile.name,
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `members-${filterRelation || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
</script>

<div
  class="flex flex-col w-full sm:w-[90%] lg:w-3/5 gap-y-5 mt-28 mb-10 text-[#161616]"
>
  <div class="text-2xl font-bold leading-7 px-4 sm:px-0">Contacts</div>

  <!-- Filter -->
  <div class="flex gap-x-2 items-center">
    <p class="text-sm">Version</p>
    <Filter
      text="All"
      filter={filterVersion}
      value={undefined}
      set={(v) => (filterVersion = v)}
    />
    <Filter
      text="Version 1"
      filter={filterVersion}
      value={1}
      set={(v) => (filterVersion = v)}
    />
    <Filter
      text="Version 2"
      filter={filterVersion}
      value={2}
      set={(v) => (filterVersion = v)}
    />
  </div>

  <div class="flex justify-between items-center flex-wrap gap-y-4">
    <div class="flex gap-2 items-center flex-wrap">
      <p class="text-sm">Relation</p>
      <Filter
        text="All"
        filter={filterRelation}
        value={undefined}
        set={(v) => (filterRelation = v)}
      />
      <Filter
        text="Mutual"
        filter={filterRelation}
        value={'mutuallyTrusts'}
        set={(v) => (filterRelation = v)}
      />
      <Filter
        text="Trusted"
        filter={filterRelation}
        value={'trusts'}
        set={(v) => (filterRelation = v)}
      />
      <Filter
        text="Trust you"
        filter={filterRelation}
        value={'trustedBy'}
        set={(v) => (filterRelation = v)}
      />
      <Filter
        text="Varies by version"
        filter={filterRelation}
        value={'variesByVersion'}
        set={(v) => (filterRelation = v)}
      />
    </div>
    <div class="flex-grow flex justify-end">
      <button class="mt-4 sm:mt-0" onclick={handleExportCSV}>Export CSV</button>
    </div>
  </div>

  <AddressInput bind:address={searchQuery} />

  <div class="w-full md:border rounded-lg md:px-4">
    <GenericList store={searched} row={ContactRow} />
  </div>
</div>
