<script lang="ts">
  import { onMount } from 'svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';

  let serviceAddress: `0x${string}` = $state('0x0');
  let mintHandlerAddress: `0x${string}` = $state('0x0');
  let redemptionHandlerAddress: `0x${string}` = $state('0x0');

  onMount(async () => {
    try {
      if (avatarState.avatar === undefined) return;

      serviceAddress = await avatarState.avatar?.service();
      mintHandlerAddress = await avatarState.avatar?.mintHandler();
      if (avatarState.groupType === 'CrcV2_CMGroupCreated')
        redemptionHandlerAddress =
          await avatarState.avatar?.redemptionHandler();
    } catch (error) {
      console.error('Error fetching contract data:', error);
    }
  });

  async function handleSetService() {
    try {
      await avatarState.avatar?.setService(serviceAddress);
    } catch (error) {
      console.error('Failed to set service address:', error);
    }
  }

  async function handleSetMintHandler() {
    try {
      await avatarState.avatar?.setMintHandler(mintHandlerAddress);
    } catch (error) {
      console.error('Failed to set mint handler address:', error);
    }
  }

  async function handleSetRedemptionHandler() {
    try {
      await avatarState.avatar?.setRedemptionHandler(redemptionHandlerAddress);
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
        onclick={handleSetService}
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
        onclick={handleSetMintHandler}
        ><img src="/update.svg" alt="Update" class="w-4" /></button
      >
    </div>
  </div>

  {#if avatarState.groupType === 'CrcV2_CMGroupCreated'}
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
          onclick={handleSetRedemptionHandler}
          ><img src="/update.svg" alt="Update" class="w-4" /></button
        >
      </div>
    </div>
  {/if}
</div>
