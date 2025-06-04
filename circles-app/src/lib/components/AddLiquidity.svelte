<script lang="ts">
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { parseEther } from 'viem';
  import SelectLbpAsset from './SelectLBPAsset.svelte';
  import { ethers } from 'ethers';

  let groupPrice = $state(0.02);
  let lastEdited: 'group' | 'asset' | 'price' | null = $state(null);
  let advancedParamsVisible = $state(false);
  let groupInitWeight = $state(80);
  let groupFinalWeight = $state(20);
  let swapFee = $state(1);
  let updateWeightDuration = $state(86400);
  let { lbpStarterContract }: { lbpStarterContract: ethers.Contract } = $props();

  let groupSetting = $state({
    address: '',
    name: '',
    amount: 480,
  });

  let assetSetting = $state({
    address: '0xaf204776c7245bf4147c2612bf6e5972ee483701',
    name: 'sDAI',
    amount: 1000,
  });

  async function handleLbpFormSubmit(e: Event) {
    e.preventDefault();

    if (!groupSetting?.amount || !assetSetting?.amount) {
      console.error('Invalid amounts:', { groupSetting, assetSetting });
      return;
    }

    const tx = await lbpStarterContract?.createLBPStarter(
      groupSetting.address,
      assetSetting.address,
      parseEther(groupSetting.amount.toString()),
      parseEther(assetSetting.amount.toString())
    );

    console.log(tx);
  }

  $effect(() => {
    groupSetting = {
      address: avatarState.avatar?.avatarInfo?.tokenId ?? '',
      name: avatarState.avatar?.avatarInfo?.name ?? '',
      amount: 480,
    };
  });

  $effect(() => {
    if (lastEdited === 'group') {
      groupPrice =
        groupSetting.amount === 0
          ? 0
          : assetSetting.amount / groupSetting.amount;
    } else if (lastEdited === 'asset') {
      groupPrice =
        groupSetting.amount === 0
          ? 0
          : assetSetting.amount / groupSetting.amount;
    } else if (lastEdited === 'price') {
      assetSetting.amount = groupPrice * groupSetting.amount;
    }
  });
</script>

<form onsubmit={handleLbpFormSubmit} class="w-full">
  <div class="form-group mb-6 flex flex-col gap-y-2">
    <SelectLbpAsset
      bind:asset={groupSetting}
      disabled={true}
      setLastEdited={() => (lastEdited = 'group')}
    />
    <SelectLbpAsset
      bind:asset={assetSetting}
      setLastEdited={() => (lastEdited = 'asset')}
    />
  </div>

  <div class="form-group mb-6">
    <label
      for="groupPriceSvelte"
      class="block mb-1 text-sm font-medium text-gray-700"
      >Group Price (USD):</label
    >
    <input
      type="number"
      id="groupPriceSvelte"
      class="input input-bordered w-full"
      required
      step="any"
      bind:value={groupPrice}
      oninput={() => (lastEdited = 'price')}
    />
  </div>

  <div class="advanced-toggle mb-6 text-center">
    <button
      type="button"
      class="btn btn-outline btn-primary btn-sm"
      onclick={() => (advancedParamsVisible = !advancedParamsVisible)}
    >
      {advancedParamsVisible ? 'Hide' : 'Show'} Advanced Parameters
    </button>
  </div>

  {#if advancedParamsVisible}
    <div class="advanced-params border-t pt-6 mt-6">
      <div class="form-group mb-6">
        <label
          for="groupInitWeightSvelte"
          class="block mb-1 text-sm font-medium text-gray-700"
          >Group Initial Weight (0-100):</label
        >
        <input
          type="number"
          id="groupInitWeightSvelte"
          class="input input-bordered w-full"
          min="0"
          max="100"
          bind:value={groupInitWeight}
        />
      </div>
      <div class="form-group mb-6">
        <label
          for="groupFinalWeightSvelte"
          class="block mb-1 text-sm font-medium text-gray-700"
          >Group Final Weight (0-100):</label
        >
        <input
          type="number"
          id="groupFinalWeightSvelte"
          class="input input-bordered w-full"
          min="0"
          max="100"
          bind:value={groupFinalWeight}
        />
      </div>
      <div class="form-group mb-6">
        <label
          for="swapFeeSvelte"
          class="block mb-1 text-sm font-medium text-gray-700"
          >Swap Fee (0-100):</label
        >
        <input
          type="number"
          id="swapFeeSvelte"
          class="input input-bordered w-full"
          min="0"
          max="100"
          bind:value={swapFee}
        />
      </div>
      <div class="form-group mb-6">
        <label
          for="updateWeightDurationSvelte"
          class="block mb-1 text-sm font-medium text-gray-700"
          >Update Weight Duration (in seconds):</label
        >
        <input
          type="number"
          id="updateWeightDurationSvelte"
          class="input input-bordered w-full"
          bind:value={updateWeightDuration}
        />
      </div>
    </div>
  {/if}

  <button type="submit" class="btn btn-primary"
    >Create LBP Starter (UI Only)</button
  >
</form>
