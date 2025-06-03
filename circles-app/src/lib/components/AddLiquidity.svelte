<script lang="ts">
  import SelectLbpAsset from './SelectLBPAsset.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import LBP_STARTER_ABI from '$lib/utils/abi/LBP_STARTER';
  import { parseEther } from 'viem';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { ethers } from 'ethers';
  import type { ContractRunner } from 'ethers';

  const LBP_STARTER_ADDRESS = '0x3b36d73506c3e75fcacb27340faa38ade1cbaf0a';

  let groupPrice = $state(0.02);

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

  let advancedParamsVisible = $state(false);
  let groupInitWeight = $state(80);
  let groupFinalWeight = $state(20);
  let swapFee = $state(1);
  let updateWeightDuration = $state(86400);
  let lbpStarterContract: ethers.Contract | null = $state(null);

  function updateGroupAmount(amount: number) {
    groupSetting.amount = amount;
    if (amount > 0) {
      groupPrice = assetSetting.amount / amount;
    }
  }

  function updateAssetAmount(amount: number) {
    assetSetting.amount = amount;
    if (groupSetting.amount > 0) {
      groupPrice = amount / groupSetting.amount;
    }
  }

  function updateGroupPrice(price: number) {
    groupPrice = price;
    if (price > 0) {
      assetSetting.amount = price * groupSetting.amount;
    }
  }

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
    const avatarTokenId = avatarState.avatar?.avatarInfo?.tokenId;
    const avatarName = avatarState.avatar?.avatarInfo?.name;
    
    if (avatarTokenId && avatarTokenId !== groupSetting.address) {
      groupSetting = {
        address: avatarTokenId,
        name: avatarName ?? '',
        amount: 480,
      };
    }
  });

  $effect(() => {
    if ($wallet) {
      lbpStarterContract = new ethers.Contract(
        LBP_STARTER_ADDRESS,
        LBP_STARTER_ABI,
        $wallet as ContractRunner
      );
    }
  });
</script>

<div class="flex flex-col items-center w-full max-w-4xl gap-y-6 mt-20">
  <h1 class="text-2xl font-bold mb-2">LBP Starter</h1>
  <p class="text-gray-600 mb-6">
    Create and manage Liquidity Bootstrapping Pools
  </p>

  <form onsubmit={handleLbpFormSubmit} class="w-full">
    <div class="form-group mb-6 flex flex-col gap-y-2">
      <SelectLbpAsset
        bind:asset={groupSetting}
        disabled={true}
        setLastEdited={() => updateGroupAmount(groupSetting.amount)}
      />
      <SelectLbpAsset
        bind:asset={assetSetting}
        setLastEdited={() => updateAssetAmount(assetSetting.amount)}
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
        oninput={(e) => {
          const target = e.target as HTMLInputElement;
          updateGroupPrice(Number(target.value));
        }}
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
</div> 