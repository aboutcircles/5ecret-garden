<script lang="ts" context="module">
  export type SelectedEvent = {
    address: string;
    profile: Profile;
  };
</script>

<script lang="ts">
  import type { Profile } from '@circles-sdk/profiles';
  import { createEventDispatcher } from 'svelte';
  import type { ContactList } from '$lib/stores/contacts';
  import { shortenAddress } from '$lib/utils/shared';
  import type { Readable } from 'svelte/store';
  import AddressInput from '$lib/components/AddressInput.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';

  export let store:
    | Readable<{
        data: ContactList;
        next: () => Promise<boolean>;
        ended: boolean;
      }>
    | undefined = undefined;

  export let selectedAddress: string = '';
  export let selectedProfile: Profile | undefined = undefined;
  export let addressListTitle: string = 'Recent';
  export let noResultsMessage: string = 'No recent addresses found';

  const eventDispatcher = createEventDispatcher();

  $: data = $store?.data ?? {};

  $: filteredAddresses = (() => {
    if (selectedAddress) {
      console.log('selectedAddress:', selectedAddress);
      return Object.keys(data).filter(
        (address) =>
          address.toLowerCase().includes(selectedAddress.toLowerCase()) ||
          data[address]?.contactProfile?.name
            ?.toLowerCase()
            ?.includes(selectedAddress.toLowerCase())
      );
    } else {
      return Object.keys(data);
    }
  })();

  function handleSelect(address: string) {
    const profile = $store?.data[address]?.contactProfile;
    selectedAddress = address;
    selectedProfile = profile;

    eventDispatcher('select', {
      address,
      profile,
    });
  }
</script>

<div class="form-control my-4 relative w-full">
  <AddressInput bind:address={selectedAddress} />
</div>

<p class="menu-title pl-0">
  {addressListTitle}
</p>
<div
  class="flex flex-col p-0 md:px-4 sm:py-4 w-full sm:border sm:rounded-lg overflow-x-auto divide-y"
>
  {#if filteredAddresses.length > 0}
    {#each filteredAddresses as address (address)}
      <button
        class="flex w-full items-center justify-between p-4 bg-base-100 hover:bg-base-200 rounded-lg"
        on:click={() => handleSelect(address)}
      >
        <Avatar {address} view="horizontal" clickable={false}>{shortenAddress(address)}</Avatar>
        <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
      </button>
    {/each}
  {:else}
    <div class="p-2 hover:bg-base-200 rounded-lg">
      {@html noResultsMessage}
    </div>
  {/if}
</div>
