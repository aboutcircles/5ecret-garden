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

<div class="space-y-4">
  <label class="form-control">
    <span class="label-text">Service address</span>
    <div class="join">
      <input id="circlesAddress" type="text" class="input input-bordered join-item w-full" bind:value={serviceAddress} placeholder="0x…" />
      <button type="button" class="btn btn-outline btn-primary join-item btn-xs" onclick={handleSetService}>
        <img src="/update.svg" alt="" class="icon" aria-hidden="true" />
      </button>
    </div>
  </label>

  <label class="form-control">
    <span class="label-text">Mint handler address</span>
    <div class="join">
      <input id="tokenAddress" type="text" class="input input-bordered join-item w-full" bind:value={mintHandlerAddress} placeholder="0x…" />
      <button type="button" class="btn btn-outline btn-primary join-item btn-xs" onclick={handleSetMintHandler}>
        <img src="/update.svg" alt="" class="icon" aria-hidden="true" />
      </button>
    </div>
  </label>

  {#if avatarState.groupType === 'CrcV2_CMGroupCreated'}
    <label class="form-control">
      <span class="label-text">Redemption handler address</span>
      <div class="join">
        <input id="redemption" type="text" class="input input-bordered join-item w-full" bind:value={redemptionHandlerAddress} placeholder="0x…" />
        <button type="button" class="btn btn-outline btn-primary join-item btn-xs" onclick={handleSetRedemptionHandler}>
          <img src="/update.svg" alt="" class="icon" aria-hidden="true" />
        </button>
      </div>
    </label>
  {/if}
</div>
