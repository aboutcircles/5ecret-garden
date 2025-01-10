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
  export let addressListTitle: string = 'Recent';
  export let noResultsMessage: string = 'No recent addresses found';

  const eventDispatcher = createEventDispatcher();

  $: data = $store?.data ?? {};

  function handleSelect(address: string) {
    const profile = $store?.data[address]?.contactProfile;
    eventDispatcher('select', { address, profile });
  }
</script>

<div class="form-control my-4 relative w-full">
  <AddressInput bind:address={selectedAddress} />
</div>

{#if selectedAddress}
  <p class="menu-title p-0">Selected Address:</p>
  <button
    class="flex w-full items-center justify-between p-4 bg-base-100 hover:bg-base-200 rounded-lg"
    on:click={() => handleSelect(selectedAddress)}
  >
    <Avatar address={selectedAddress} clickable={false} view="horizontal" />
    <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
  </button>
{:else}
  <p class="menu-title pl-0">{addressListTitle}</p>
  <div
    class="flex flex-col p-0 md:px-4 sm:py-4 w-full sm:border sm:rounded-lg overflow-x-auto divide-y"
  >
    {#if Object.keys(data).length > 0}
      {#each Object.keys(data) as address (address)}
        <button
          class="flex w-full items-center justify-between p-4 bg-base-100 hover:bg-base-200 rounded-lg"
          on:click={() => handleSelect(address)}
        >
          <Avatar {address} view="horizontal" clickable={false} />
          <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
        </button>
      {/each}
    {:else}
      <div class="p-2 hover:bg-base-200 rounded-lg">
        {@html noResultsMessage}
      </div>
    {/if}
  </div>
{/if}
