<script lang="ts">
  import SelectContact, { type SelectedEvent } from '$lib/pages/SelectContact.svelte';
  import type { ContactList } from '$lib/stores/contacts';
  import { onMount } from 'svelte';
  import { derived, type Readable } from 'svelte/store';
  import type { GroupMintFlowContext } from '$lib/flows/mintGroupTokens/context';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import SelectAsset from '$lib/flows/mintGroupTokens/2_Asset.svelte';
  import { contacts } from '$lib/stores/contacts';
  import { popupControls } from '$lib/stores/popUp';
  import type { TokenBalanceRow } from '@circles-sdk/data';

  export let context: GroupMintFlowContext = {
    selectedAddress: undefined,
    selectedAsset: {} as TokenBalanceRow,
    amount: undefined,
  };

  // Derived store that includes only group contacts
  let groupContacts:
    | Readable<{
        data: ContactList;
        next: () => Promise<boolean>;
        ended: boolean;
      }>
    | undefined = undefined;

  onMount(async () => {
    // Create a derived store that filters contacts to only groups
    groupContacts = derived(contacts, ($contacts) => ({
      data: Object.fromEntries(
        Object.entries($contacts.data).filter(
          ([, contactItem]) =>
            contactItem.avatarInfo?.type === 'CrcV2_RegisterGroup'
        )
      ),
      next: $contacts.next,
      ended: $contacts.ended,
    }));
  });

  function handleSelect(
    event: CustomEvent<SelectedEvent>
  ) {
    console.log('Selected address', event.detail.address);
    context.selectedAddress = event.detail.address;

    popupControls.open({
      title: 'Select Asset',
      component: SelectAsset,
      props: {
        context: context,
      },
    });
  }
</script>

<FlowDecoration>
  <p class="text-2xl font-bold">Mint Group Token</p>
  <p class="text-gray-500 mt-2">
    You can convert any of your CRC to tokens of any group you are part of
  </p>
  {#if groupContacts}
    <SelectContact
      store={groupContacts}
      addressListTitle="Groups"
      noResultsMessage="No groups found"
      selectedAddress={context?.selectedAddress}
      group={true}
      on:select={handleSelect}
    />
  {:else}
    <p>Loading contacts...</p>
  {/if}
</FlowDecoration>
