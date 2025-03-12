<script lang="ts" context="module">
  import type { Profile } from '@circles-sdk/profiles';
  import type { Address } from '@circles-sdk/utils';

  export type SelectedEvent = {
    address: Address;
    profile: Profile;
  };
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ContactList } from '$lib/stores/contacts';
  import type { Readable } from 'svelte/store';
  import AddressInput from '$lib/components/AddressInput.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { shortenAddress } from '$lib/utils/shared';

  export let store:
    | Readable<{
        data: ContactList;
        next: () => Promise<boolean>;
        ended: boolean;
      }>
    | undefined = undefined;

  export let selectedAddress: string = '';
  export let addressListTitle: string = 'Recent';
  export let noResultsMessage: string = 'No recent addresses found';
  export let group: boolean = false;

  const eventDispatcher = createEventDispatcher();

  $: data = $store?.data ?? {};
  $: filteredAddresses = (() => {
    if (selectedAddress) {
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
    eventDispatcher('select', <SelectedEvent>{ address, profile });
  }
</script>

<div class="form-control my-4 relative w-full">
  <AddressInput bind:address={selectedAddress} />
</div>

{#if selectedAddress && !group}
  <p class="menu-title p-0">Selected Address:</p>
  <button
    class="w-full flex items-center justify-between p-2 hover:bg-black/5 rounded-lg mt-2"
    on:click={() => handleSelect(selectedAddress)}
  >
    <Avatar
      address={selectedAddress}
      clickable={false}
      view="horizontal"
      bottomInfo={shortenAddress(selectedAddress)}
    />
    <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
  </button>
{:else}
  <p class="menu-title pl-0">{addressListTitle}</p>
  {#if filteredAddresses.length > 0}
    <div
      class="w-full md:border rounded-lg md:px-4 flex flex-col divide-y gap-y-2 overflow-x-auto py-4"
    >
      {#each filteredAddresses as address (address)}
        <div class="w-full pt-2">
          <button
            class="w-full flex items-center justify-between p-2 hover:bg-black/5 rounded-lg"
            on:click={() => handleSelect(address)}
          >
            <Avatar
              {address}
              view="horizontal"
              clickable={false}
              bottomInfo={shortenAddress(address)}
            />
            <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
          </button>
        </div>
      {/each}
    </div>
  {:else}
    {@html noResultsMessage}
  {/if}
{/if}
