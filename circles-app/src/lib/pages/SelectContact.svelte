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
    class="w-full flex items-center justify-between p-2 hover:bg-black/5 rounded-lg mt-2"
    on:click={() => handleSelect(selectedAddress)}
  >
    <Avatar address={selectedAddress} clickable={false} view="horizontal" />
    <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
  </button>
{:else}
  <p class="menu-title pl-0">{addressListTitle}</p>
  <div
    class="w-full md:border rounded-lg md:px-4 flex flex-col divide-y gap-y-2 overflow-x-auto py-4"
  >
    {#if Object.keys(data).length > 0}
      {#each Object.keys(data) as address (address)}
      <div class="w-full pt-2">
        <button
          class="w-full flex items-center justify-between p-2 hover:bg-black/5 rounded-lg"
          on:click={() => handleSelect(address)}
        >
          <Avatar {address} view="horizontal" clickable={false} />
          <img src="/chevron-right.svg" alt="Chevron Right" class="w-4" />
        </button>
  </div>
      {/each}
    {:else}
      <div class="p-2 hover:bg-base-200 rounded-lg">
        {@html noResultsMessage}
      </div>
    {/if}
  </div>
{/if}
