<script lang="ts">
  import { ethers } from 'ethers6';
  import { createEventDispatcher, onMount } from 'svelte';
  import { type AvatarRow, CirclesQuery } from '@circles-sdk/data';
  import { circles } from '$lib/stores/circles';
  import { createCirclesQueryStore } from '$lib/stores/query/circlesQueryStore';
  import type { Readable } from 'svelte/store';
  import GenericList from '$lib/components/GenericList.svelte';
  import AvatarRowView from '$lib/components/AvatarRow.svelte';
  import AddressInput from '$lib/components/AddressInput.svelte';

  export let selectedAddress: string | undefined = undefined;

  //   let input: HTMLInputElement | undefined;
  //   let editorText: string | undefined = undefined;

  let store:
    | Readable<{
        data: AvatarRow[];
        next: () => Promise<boolean>;
        ended: boolean;
      }>
    | undefined = undefined;

  const eventDispatcher = createEventDispatcher();

  onMount(async () => {
    // if (selectedAddress && input) {
    //   editorText = selectedAddress;
    //   input.value = editorText;
    // }
    store = await createStore();
  });

  //   const handleInput = async (e: any) => {
  //     editorText = (e.target as HTMLInputElement).value;
  //     if (ethers.isAddress(editorText)) {
  //       selectedAddress = editorText;
  //     }
  //     console.log('Input', editorText);
  //     store = await createStore();
  //   };

  async function createQuery(): Promise<CirclesQuery<AvatarRow>> {
    if (!$circles) {
      throw new Error('Circles not loaded');
    }
    return new CirclesQuery($circles.circlesRpc, {
      namespace: 'V_Crc',
      table: 'Avatars',
      columns: [],
      filter: [
        {
          Type: 'Conjunction',
          ConjunctionType: 'Or',
          Predicates: [
            {
              Type: 'FilterPredicate',
              FilterType: 'Like',
              Column: 'avatar',
              Value: (selectedAddress?.toLowerCase() ?? '') + '%',
            },
            {
              Type: 'FilterPredicate',
              FilterType: 'ILike',
              Column: 'name',
              Value: (selectedAddress ?? '') + '%',
            },
          ],
        },
      ],
      sortOrder: 'DESC',
      limit: 25,
    });
  }

  function createStore() {
    return createCirclesQueryStore<AvatarRow>(createQuery);
  }

  function handleInvite() {
    eventDispatcher('invite', { avatar: selectedAddress });
  }

  async function updateStore() {
    console.log('update store', selectedAddress);
    store = await createStore();
  }

  $: if (selectedAddress) {
    updateStore();
  }
</script>

<div class="form-control my-4">
  <AddressInput bind:address={selectedAddress} />
</div>

<div class="mt-4">
  <p class="menu-title pl-0">Found avatars</p>

  {#if $store?.data?.length > 0}
    <GenericList {store} row={AvatarRowView} on:select />
  {:else}
    <div class="text-center">
      <div>
        {#if ethers.isAddress(selectedAddress)}
          <button class="btn mt-6" on:click={handleInvite}
            >Invite {selectedAddress}</button
          >
        {:else if selectedAddress}
          <p class="text-error mt-6">Invalid address</p>
        {:else}
          <p>No avatars found.</p>
        {/if}
      </div>
    </div>
  {/if}
</div>
