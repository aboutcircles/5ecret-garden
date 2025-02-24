<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import {
    groupAvatarContract,
    setMintHandler,
    setRedemptionHandler,
  } from '$lib/stores/groupAvatar';
  import { setService } from '$lib/stores/groupAvatar';

  let serviceAddress = '';
  let mintHandlerAddress = '';
  let redemptionHandlerAddress = '';

  onMount(async () => {
    try {
      const contract = get(groupAvatarContract);
      if (!contract) throw new Error('Contract not initialized');

      serviceAddress = await contract.service();
      mintHandlerAddress = await contract.mintHandler();
      redemptionHandlerAddress = await contract.redemptionHandler();
    } catch (error) {
      console.error('Error fetching contract data:', error);
    }
  });

  async function handleSetService() {
    try {
      await setService(serviceAddress);
    } catch (error) {
      console.error('Failed to set service address:', error);
    }
  }

  async function handleSetMintHandler() {
    try {
      await setMintHandler(serviceAddress);
    } catch (error) {
      console.error('Failed to set mint handler address:', error);
    }
  }

  async function handleSetRedemptionHandler() {
    try {
      await setRedemptionHandler(serviceAddress);
    } catch (error) {
      console.error('Failed to set redemption handler address:', error);
    }
  }
</script>

<div class="space-y-2">
  <div>
    <label for="circlesAddress" class="block text-sm font-medium text-black">
      Service address
    </label>
    <div class="flex items-center space-x-2">
      <input
        type="text"
        id="circlesAddress"
        bind:value={serviceAddress}
        class="mt-2 block w-full p-2 border border-gray-300 rounded-md"
        placeholder="0x..."
      />
      <button
        type="button"
        class="btn btn-square btn-xs btn-primary btn-outline"
        on:click={handleSetService}
        ><img src="/update.svg" alt="Update" class="w-4" /></button
      >
    </div>
  </div>

  <div>
    <label for="tokenAddress" class="block text-sm font-medium text-black">
      Mint Handler address
    </label>
    <div class="flex items-center space-x-2">
      <input
        type="text"
        id="tokenAddress"
        bind:value={mintHandlerAddress}
        class="mt-2 block w-full p-2 border border-gray-300 rounded-md"
        placeholder="0x..."
      /><button
        type="button"
        class="btn btn-square btn-xs btn-primary btn-outline"
        on:click={handleSetMintHandler}
        ><img src="/update.svg" alt="Update" class="w-4" /></button
      >
    </div>
  </div>

  <div>
    <label for="name" class="block text-sm font-medium text-black">
      Redemption Handler address
    </label>
    <div class="flex items-center space-x-2">
      <input
        type="text"
        id="name"
        bind:value={redemptionHandlerAddress}
        class="mt-2 block w-full p-2 border border-gray-300 rounded-md"
        placeholder="0x..."
      /><button
        type="button"
        class="btn btn-square btn-xs btn-primary btn-outline"
        on:click={handleSetRedemptionHandler}
        ><img src="/update.svg" alt="Update" class="w-4" /></button
      >
    </div>
  </div>
</div>
