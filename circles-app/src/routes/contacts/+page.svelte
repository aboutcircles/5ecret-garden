<script lang="ts">
  import { contacts } from '$lib/stores/contacts';
  import { onMount } from 'svelte';
  import Papa from 'papaparse';
  import GenericList from '$lib/components/GenericList.svelte';
  import ModernContactRow from './ModernContactRow.svelte';
  import { derived, writable } from 'svelte/store';
  import Filter from '$lib/components/Filter.svelte';
  import AddressInput from '$lib/components/AddressInput.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import ManageGroupMembers from '$lib/flows/manageGroupMembers/1_manageGroupMembers.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import ManageContactsIcon from '$lib/components/icons/ManageContactsIcon.svelte';

  let filterVersion = writable<number | undefined>(undefined);
  let filterRelation = writable<
    'mutuallyTrusts' | 'trusts' | 'trustedBy' | 'variesByVersion' | undefined
  >(undefined);
  let searchQuery = writable<string>('');

  let filteredStore = derived(
    [contacts, filterVersion, filterRelation],
    ([$contacts, filterVersion, filterRelation]) => {
      const filteredData = Object.entries($contacts.data)
        .filter(
          ([_, contact]) =>
            (!filterVersion ||
              contact?.avatarInfo?.version === filterVersion) &&
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
</script>

<div
  class="flex flex-col items-start w-full max-w-3xl gap-y-4 mt-32"
>
  <div class="w-full flex justify-between items-center px-4 sm:px-0">
    <div class="text-2xl font-bold leading-7">Contacts</div>
    <button 
      class="flex items-center gap-2 px-4 py-2 btn btn-primary font-medium transition-colors duration-200"
      onclick={() => {
        popupControls.open({
          title: avatarState.isGroup ? 'Manage members' : 'Manage contacts',
          component: ManageGroupMembers,
          props: {},
        });
      }}
    >
      <ManageContactsIcon size="sm" />
      {avatarState.isGroup ? 'Manage members' : 'Manage contacts'}
    </button>
  </div>

  <!-- Filter -->
  <div class="flex gap-x-2 items-center">
    <p class="text-sm">Version</p>
    <Filter text="All" filter={filterVersion} value={undefined} />
    <Filter text="Version 1" filter={filterVersion} value={1} />
    <Filter text="Version 2" filter={filterVersion} value={2} />
  </div>

  <div class="flex gap-2 items-center flex-wrap">
    <p class="text-sm">Relation</p>
    <Filter text="All" filter={filterRelation} value={undefined} />
    <Filter text="Mutual" filter={filterRelation} value={'mutuallyTrusts'} />
    <Filter text="Trusted" filter={filterRelation} value={'trusts'} />
    <Filter text="Trust you" filter={filterRelation} value={'trustedBy'} />
    <Filter
      text="Varies by version"
      filter={filterRelation}
      value={'variesByVersion'}
    />
  </div>

  <AddressInput bind:address={$searchQuery} />

  <div class="w-full bg-white border rounded-lg px-4 flex flex-col divide-y py-4">
    <GenericList store={searchedStore} row={ModernContactRow} />
  </div>
</div>
