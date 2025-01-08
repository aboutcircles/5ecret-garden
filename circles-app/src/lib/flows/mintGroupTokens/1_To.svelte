<script lang="ts">
  import type { PopupContentApi } from '$lib/components/PopUp.svelte';
  import SelectContact from '$lib/pages/SelectContact.svelte';
  import type { ContactList } from '$lib/stores/contacts';
  import type { Profile } from '@circles-sdk/profiles';
  import { onMount } from 'svelte';
  import { derived, type Readable } from 'svelte/store';
  import type { GroupMintFlowContext } from '$lib/flows/mintGroupTokens/context';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import SelectAsset from '$lib/flows/mintGroupTokens/2_Asset.svelte';
  import { contacts } from '$lib/stores/contacts';

  export let contentApi: PopupContentApi;
  export let context: GroupMintFlowContext;

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
    event: CustomEvent<{ address: string; profile: Profile }>
  ) {
    context.selectedAddress = event.detail.address;
    console.log('Selected address', event.detail.address);

    contentApi.open({
      title: 'Select Asset',
      component: SelectAsset,
      props: {
        context: context,
      },
    });
  }
</script>

<FlowDecoration>
  <p class="text-2xl font-bold mt-14">Mint Group Token</p>
  <p class="text-gray-500 mt-2">
    You can convert any of your CRC to tokens of any group you are part of
  </p>
  {#if groupContacts}
    <SelectContact
      store={groupContacts}
      addressListTitle="Groups"
      noResultsMessage="You have no groups in your contacts."
      selectedAddress={context?.selectedAddress}
      on:select={handleSelect}
    />
  {:else}
    <p>Loading contacts...</p>
  {/if}
</FlowDecoration>
