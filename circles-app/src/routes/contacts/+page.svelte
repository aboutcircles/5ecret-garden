<!-- @migration-task Error while migrating Svelte code: can't migrate `$: filteredStore = derived(contacts, ($contacts) => {
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
  });` to `$derived` because there's a variable named derived.
     Rename the variable and try again or migrate by hand. -->
<script lang="ts">
  import { contacts } from '$lib/stores/contacts';
  import { onMount } from 'svelte';
  import Papa from 'papaparse';
  import GenericList from '$lib/components/GenericList.svelte';
  import ContactRow from './ContactRow.svelte';
  import { derived } from 'svelte/store';

  let filterVersion: number | undefined = undefined;

  $: filteredStore = derived(contacts, ($contacts) => {
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
  });

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
    <button
      class={`bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm flex flex-row items-center gap-x-1 font-medium hover:text-black/70 hover:cursor-pointer ${
        filterVersion === undefined ? 'text-black' : 'text-gray-400'
      }`}
      on:click={() => (filterVersion = undefined)}
    >
      All
    </button>
    <button
      class={`bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm flex flex-row items-center gap-x-1 font-medium hover:text-black/70 hover:cursor-pointer ${
        filterVersion === 1 ? 'text-black' : 'text-gray-400'
      }`}
      on:click={() => (filterVersion = 1)}
    >
      Version 1
    </button>
    <button
      class={`bg-[#F3F4F6] border-none rounded-lg px-2 py-1 text-sm flex flex-row items-center gap-x-1 font-medium hover:text-black/70 hover:cursor-pointer ${
        filterVersion === 2 ? 'text-black' : 'text-gray-400'
      }`}
      on:click={() => (filterVersion = 2)}
    >
      Version 2
    </button>

    <div class="flex-grow"></div>
    <button on:click={handleExportCSV}>Export CSV</button>
  </div>

  <div class="w-full md:border rounded-lg md:px-4">
    <GenericList store={filteredStore} row={ContactRow} />
  </div>
</div>
