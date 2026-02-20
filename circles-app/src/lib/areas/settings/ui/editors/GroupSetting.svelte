<script lang="ts">
  import { onMount } from 'svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
<<<<<<<< HEAD:circles-app/src/routes/settings/editors/GroupSetting.svelte
  import { Check as LCheck, X as LX } from 'lucide';
  import type { BaseGroupAvatar } from '@aboutcircles/sdk';
  import type { Address } from '@aboutcircles/sdk-types';
  import { runTask } from '$lib/shared/utils/tasks';
  import { ethers } from 'ethers';
========
  import { Check as LCheck } from 'lucide';
>>>>>>>> 763475c10951572cae4be4f01514c892c43b7ac8:circles-app/src/lib/areas/settings/ui/editors/GroupSetting.svelte

  let serviceAddress: `0x${string}` = $state('0x0');
  let mintHandlerAddress: `0x${string}` = $state('0x0');
  let feeCollectionAddress: `0x${string}` = $state('0x0');
  let membershipConditions: Address[] = $state([]);
  let newConditionAddress: `0x${string}` = $state('0x0');

  onMount(async () => {
    try {
      if (avatarState.avatar === undefined || !avatarState.isGroup) return;

      const groupAvatar = avatarState.avatar as BaseGroupAvatar;

      serviceAddress = await groupAvatar.properties.service() as `0x${string}`;
      mintHandlerAddress = await groupAvatar.properties.mintHandler() as `0x${string}`;
      feeCollectionAddress = await groupAvatar.properties.feeCollection() as `0x${string}`;
      membershipConditions =
        await groupAvatar.properties.getMembershipConditions();
    } catch (error) {
      console.error('Error fetching contract data:', error);
    }
  });

  async function handleSetService() {
    if (!avatarState.avatar || !avatarState.isGroup) return;
    const groupAvatar = avatarState.avatar as BaseGroupAvatar;

    runTask({
      name: 'Setting service address...',
      promise: (async () => {
        const receipt = await groupAvatar.setProperties.service(serviceAddress);
        console.log('Service address updated:', receipt);
      })(),
    });
  }

  async function handleSetFeeCollection() {
    if (!avatarState.avatar || !avatarState.isGroup) return;
    const groupAvatar = avatarState.avatar as BaseGroupAvatar;

    runTask({
      name: 'Setting fee collection address...',
      promise: (async () => {
        const receipt =
          await groupAvatar.setProperties.feeCollection(feeCollectionAddress);
        console.log('Fee collection address updated:', receipt);
      })(),
    });
  }

  async function handleAddCondition() {
    if (!avatarState.avatar || !avatarState.isGroup) return;
    if (!newConditionAddress || newConditionAddress === '0x0') return;

    // Validate Ethereum address
    if (!ethers.isAddress(newConditionAddress)) {
      alert('Please enter a valid Ethereum address');
      return;
    }

    const groupAvatar = avatarState.avatar as BaseGroupAvatar;

    runTask({
      name: 'Adding membership condition...',
      promise: (async () => {
        const receipt = await groupAvatar.setProperties.membershipCondition(
          newConditionAddress as Address,
          true
        );
        console.log('Add condition receipt:', receipt);

        // Wait a bit for the blockchain state to update
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Reload conditions after transaction is confirmed
        membershipConditions =
          await groupAvatar.properties.getMembershipConditions();
        console.log('Updated conditions:', membershipConditions);
        newConditionAddress = '0x0';
      })(),
    });
  }

  async function handleRemoveCondition(condition: Address) {
    if (!avatarState.avatar || !avatarState.isGroup) return;
    const groupAvatar = avatarState.avatar as BaseGroupAvatar;

    runTask({
      name: 'Removing membership condition...',
      promise: (async () => {
        const receipt = await groupAvatar.setProperties.membershipCondition(
          condition,
          false
        );
        console.log('Remove condition receipt:', receipt);

        // Wait a bit for the blockchain state to update
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Reload conditions after transaction is confirmed
        membershipConditions =
          await groupAvatar.properties.getMembershipConditions();
        console.log('Updated conditions:', membershipConditions);
      })(),
    });
  }
</script>

<div class="space-y-6">
  <!-- Service Address -->
  <label class="form-control">
    <span class="label-text font-semibold">Service address</span>
    <div class="join">
<<<<<<<< HEAD:circles-app/src/routes/settings/editors/GroupSetting.svelte
      <input
        type="text"
        class="input input-bordered join-item w-full"
        bind:value={serviceAddress}
        placeholder="0x…"
      />
      <button
        type="button"
        class="btn btn-outline btn-primary join-item"
        onclick={handleSetService}
      >
        <Lucide
          icon={LCheck}
          size={16}
          class="shrink-0 stroke-black"
          ariaLabel="Save"
        />
========
      <input id="circlesAddress" type="text" class="input input-bordered join-item w-full" bind:value={serviceAddress} placeholder="0x…" />
      <button type="button" class="btn btn-primary join-item btn-xs" onclick={handleSetService}>
        <Lucide icon={LCheck} size={16} class="shrink-0" ariaLabel="" />
>>>>>>>> 763475c10951572cae4be4f01514c892c43b7ac8:circles-app/src/lib/areas/settings/ui/editors/GroupSetting.svelte
      </button>
    </div>
  </label>

  <!-- Fee Collection Address -->
  <label class="form-control">
    <span class="label-text font-semibold">Fee collection address</span>
    <div class="join">
<<<<<<<< HEAD:circles-app/src/routes/settings/editors/GroupSetting.svelte
      <input
        type="text"
        class="input input-bordered join-item w-full"
        bind:value={feeCollectionAddress}
        placeholder="0x…"
      />
      <button
        type="button"
        class="btn btn-outline btn-primary join-item"
        onclick={handleSetFeeCollection}
      >
        <Lucide
          icon={LCheck}
          size={16}
          class="shrink-0 stroke-black"
          ariaLabel="Save"
        />
========
      <input id="tokenAddress" type="text" class="input input-bordered join-item w-full" bind:value={mintHandlerAddress} placeholder="0x…" />
      <button type="button" class="btn btn-primary join-item btn-xs" onclick={handleSetMintHandler}>
        <Lucide icon={LCheck} size={16} class="shrink-0" ariaLabel="" />
>>>>>>>> 763475c10951572cae4be4f01514c892c43b7ac8:circles-app/src/lib/areas/settings/ui/editors/GroupSetting.svelte
      </button>
    </div>
  </label>

<<<<<<<< HEAD:circles-app/src/routes/settings/editors/GroupSetting.svelte
  <!-- Mint Handler (read-only) -->
  <label class="form-control">
    <span class="label-text font-semibold"
      >Mint handler address <span class="text-xs text-base-content/60"
        >(read-only)</span
      ></span
    >
    <input
      type="text"
      class="input input-bordered w-full"
      value={mintHandlerAddress}
      placeholder="0x…"
      disabled
    />
  </label>

  <!-- Membership Conditions -->
  <div class="form-control">
    <div class="mb-2">
      <span class="label-text font-semibold">Membership conditions</span>
      <p class="text-xs text-base-content/60 mt-1">
        Add contract addresses one at a time. Each condition is a separate smart
        contract.
      </p>
    </div>

    <!-- Add new condition -->
    <div class="join mb-3">
      <input
        type="text"
        class="input input-bordered join-item w-full"
        bind:value={newConditionAddress}
        placeholder="Enter condition contract address (0x…)"
      />
      <button
        type="button"
        class="btn btn-outline btn-primary join-item"
        onclick={handleAddCondition}
      >
        <Lucide
          icon={LCheck}
          size={16}
          class="shrink-0 stroke-black"
          ariaLabel="Add"
        />
        <span class="hidden sm:inline ml-1">Add</span>
      </button>
    </div>

    <!-- List of conditions -->
    {#if membershipConditions.length > 0}
      <div class="space-y-2">
        {#each membershipConditions as condition}
          <div class="flex items-center gap-2 p-2 bg-base-200 rounded">
            <code class="flex-1 text-xs break-all">{condition}</code>
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-circle"
              onclick={() => handleRemoveCondition(condition)}
              aria-label="Remove condition"
            >
              <Lucide icon={LX} size={14} class="shrink-0 stroke-error" />
            </button>
          </div>
        {/each}
========
  {#if avatarState.groupType === 'CrcV2_CMGroupCreated'}
    <label class="form-control">
      <span class="label-text">Redemption handler address</span>
      <div class="join">
        <input id="redemption" type="text" class="input input-bordered join-item w-full" bind:value={redemptionHandlerAddress} placeholder="0x…" />
        <button type="button" class="btn btn-primary join-item btn-xs" onclick={handleSetRedemptionHandler}>
          <Lucide icon={LCheck} size={16} class="shrink-0" ariaLabel="" />
        </button>
>>>>>>>> 763475c10951572cae4be4f01514c892c43b7ac8:circles-app/src/lib/areas/settings/ui/editors/GroupSetting.svelte
      </div>
    {:else}
      <p class="text-sm text-base-content/60 italic">
        No membership conditions set
      </p>
    {/if}
  </div>
</div>
