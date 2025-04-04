<script lang="ts">
  import { contacts } from '$lib/stores/contacts';
  import { onMount } from 'svelte';
  import Papa from 'papaparse';
  import GenericList from '$lib/components/GenericList.svelte';
  import ContactRow from './ContactRow.svelte';
  import { derived, writable } from 'svelte/store';
  import Filter from '$lib/components/Filter.svelte';
  import AddressInput from '$lib/components/AddressInput.svelte';

  let filterVersion = writable<number | undefined>(undefined);
  let searchQuery = writable<string>('');

  let filteredStore = derived(
    [contacts, filterVersion],
    ([$contacts, filterVersion]) => {
      const filteredData = Object.entries($contacts.data)
        .filter(
          ([_, contact]) =>
            !filterVersion || contact?.avatarInfo?.version === filterVersion
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
    }
  );

  let searchedStore = derived(
    [filteredStore, searchQuery],
    ([$filteredStore, searchQuery]) => {
      let results = $filteredStore.data.filter((item) => {
        const name = item.contact?.contactProfile.name || '';
        return (
          item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          name.toLowerCase().includes(searchQuery.toLowerCase())
        );
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

  onMount(() => {
    const unsubscribe = contacts.subscribe(() => {});
    return unsubscribe;
  });

  async function handleExportCSV() {
    const csvData = Object.keys($contacts.data);
    const csv = Papa.unparse(csvData.map((address) => ({ address })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'members.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
</script>

<div
  class="flex flex-col w-full sm:w-[90%] lg:w-3/5 p-0 gap-y-5 mt-28 mb-10 text-[#161616]"
>
  <div class="text-2xl font-bold leading-7 px-4 sm:px-0">Contacts</div>

  <!-- Filter -->
  <div class="flex flex-row gap-x-2">
    <Filter text="All" filter={filterVersion} value={undefined} />
    <Filter text="Version 1" filter={filterVersion} value={1} />
    <Filter text="Version 2" filter={filterVersion} value={2} />
    <div class="flex-grow"></div>
    <button onclick={handleExportCSV}>Export CSV</button>
  </div>
  
  <AddressInput bind:address={$searchQuery} />

  <div class="w-full md:border rounded-lg md:px-4">
    <GenericList store={searchedStore} row={ContactRow} />
  </div>
</div>
