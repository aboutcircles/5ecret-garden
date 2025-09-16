<script lang="ts" module>
  import type { Profile } from '@circles-sdk/profiles';
  import type { Address } from '@circles-sdk/utils';

  export type SelectedEvent = {
    address: Address;
    profile: Profile;
  };
</script>

<script lang="ts">
  import type { ContactList } from '$lib/stores/contacts';
  import type { Readable } from 'svelte/store';
  import AddressInput from '$lib/components/AddressInput.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { shortenAddress } from '$lib/utils/shared';


  interface Props {
    store?: 
    | Readable<{
        data: ContactList;
        next: () => Promise<boolean>;
        ended: boolean;
      }>
    | undefined;
    selectedAddress?: Address;
    addressListTitle?: string;
    noResultsMessage?: string;
    group?: boolean;
    onselect?: (address: Address) => void;
  }

  let {
    store = undefined,
    selectedAddress = $bindable(''),
    addressListTitle = 'Recent',
    noResultsMessage = 'No recent addresses found',
    group = false,
    onselect
  }: Props = $props();

  let data = $derived($store?.data ?? {});
  let filteredAddresses = $derived((() => {
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
  })());

  function handleSelect(address: Address) {
    const profile = $store?.data[address]?.contactProfile;
    onselect?.(address);
  }
</script>

<div class="form-control my-4 relative w-full">
  <AddressInput bind:address={selectedAddress} />
</div>

{#if selectedAddress && !group}
  <p class="menu-title p-0">Selected Address:</p>
  <button
    class="w-full flex items-center justify-between p-2 hover:bg-base-200 rounded-lg mt-2"
    onclick={() => handleSelect(selectedAddress)}
  >
    <Avatar
      address={selectedAddress}
      clickable={false}
      view="horizontal"
      bottomInfo={shortenAddress(selectedAddress)}
    />
    <img src="/chevron-right.svg" alt="" class="icon" aria-hidden="true" />
  </button>
{:else}
  <p class="menu-title pl-0">{addressListTitle}</p>
  {#if filteredAddresses.length > 0}
    <div
      class="w-full border border-base-300 rounded-lg md:px-4 flex flex-col divide-y gap-y-2 overflow-x-auto py-4"
    >
      {#each filteredAddresses as address (address)}
        <div class="w-full pt-2">
          <button
            class="w-full flex items-center justify-between p-2 hover:bg-base-200 rounded-lg"
            onclick={() => handleSelect(address)}
          >
            <Avatar
              {address}
              view="horizontal"
              clickable={false}
              bottomInfo={shortenAddress(address)}
            />
            <img src="/chevron-right.svg" alt="" class="icon" aria-hidden="true" />
          </button>
        </div>
      {/each}
    </div>
  {:else}
    {@html noResultsMessage}
  {/if}
{/if}
