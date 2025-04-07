<script lang="ts">
  import { onMount } from 'svelte';
  import FlowDecoration from '$lib/flows/FlowDecoration.svelte';
  import type { MigrateToV2Context } from '$lib/flows/migrateToV2/context';
  import Migrate from './4_Migrate.svelte';
  import { contacts } from '$lib/stores/contacts';
  import { formatTrustRelation } from '$lib/utils/helpers';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { popupControls } from '$lib/stores/popUp';

  interface Props {
    context: MigrateToV2Context;
  }

  let { context = $bindable() }: Props = $props();

  let selectedAddresses: string[] = $state([]);

  onMount(async () => {
    selectedAddresses = context.trustList ?? Object.keys($contacts?.data ?? {});
    console.log('Selected addresses', selectedAddresses);
  });

  async function next() {
    popupControls.open({
      title: 'Run Migration',
      component: Migrate,
      props: {
        context: context,
      },
    });
  }

  let orderedContacts = $derived(Object.keys($contacts?.data ?? {}).sort((a, b) => {
    /*
            // Alphabetical sorting by contact name
            const aRelation = $contacts?.data[a]?.contactProfile?.name;
            const bRelation = $contacts?.data[b]?.contactProfile?.name;
            return aRelation.localeCompare(bRelation);
         */
    const aRelation = $contacts?.data[a].row.relation;
    const bRelation = $contacts?.data[b].row.relation;
    if (aRelation === 'mutuallyTrusts' && bRelation !== 'mutuallyTrusts') {
      return -1;
    }
    if (aRelation === 'trusts' && bRelation === 'trustedBy') {
      return -1;
    }
    if (aRelation === bRelation) {
      return 0;
    }
    if (bRelation === 'mutuallyTrusts' && aRelation !== 'mutuallyTrusts') {
      return 1;
    }
    if (bRelation === 'trusts' && aRelation === 'trustedBy') {
      return 1;
    }
    return 0;
  }));
</script>

<FlowDecoration>
  <p class="text-2xl font-bold">Contact</p>
  <p class="text-gray-500 mt-2">
    Select the contacts you want to keep in your new Circles V2 profile.
  </p>
  <div class="mt-6">
    {#each orderedContacts as address}
      <button
        class="p-2 bg-base-100 hover:bg-base-200 rounded-lg items-center block"
        onclick={(e) => {
          console.log('Selected address', address);
          // Toggle selection
          if (selectedAddresses.includes(address)) {
            selectedAddresses = selectedAddresses.filter((a) => a !== address);
          } else {
            selectedAddresses = [...selectedAddresses, address];
          }
          context.trustList = selectedAddresses;
        }}
      >
        <Avatar
          pictureOverlayUrl={selectedAddresses.includes(address)
            ? '/check.svg'
            : undefined}
          {address}
          clickable={false}
          view="horizontal"
        >
          <div>
            {#if $contacts?.data[address].row.relation === 'trusts'}
              <img
                src="/incoming.svg"
                alt="Incoming trust"
                class="w-3 h-3 inline"
              />
            {/if}
            {#if $contacts?.data[address].row.relation === 'trustedBy'}
              <img
                src="/outgoing.svg"
                alt="Outgoing trust"
                class="w-3 h-3 inline"
              />
            {/if}
            {#if $contacts?.data[address].row.relation === 'mutuallyTrusts'}
              <img
                src="/mutual.svg"
                alt="Mutual trust"
                class="w-3 h-3 inline"
              />
            {/if}
            {#if $contacts?.data[address]}
              <span>{formatTrustRelation($contacts.data[address].row.relation)}</span>
            {/if}
          </div>
        </Avatar>
      </button>
    {/each}
    {#if orderedContacts.length === 0}
      <p class="text-center mt-4">No contacts to migrate</p>
    {/if}
  </div>
  <div class="flex justify-end space-x-2 mt-6">
    <button
      type="submit"
      class="btn btn-primary text-white"
      onclick={() => next()}
    >
      Next
    </button>
  </div>
</FlowDecoration>
