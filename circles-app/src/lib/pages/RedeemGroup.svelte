<script lang="ts">
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import type { Address } from '@aboutcircles/sdk-types';
  import { uint256ToAddress } from '@aboutcircles/sdk-utils';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { onMount } from 'svelte';
  import { formatUnits, parseUnits } from 'ethers';
  import type { TokenBalance, TrustRelationType } from '@aboutcircles/sdk-types';
  import { contacts } from '$lib/stores/contacts';
  import {
    getGroupCollateral,
    getTreasuryAddress,
    getVaultAddress,
  } from '$lib/utils/vault';
  import CollateralTable from '$lib/components/CollateralTable.svelte';

  interface Props {
    asset: TokenBalance;
  }

  let { asset }: Props = $props();

  // Collateral display (read-only, no manual selection)
  let collateralInTreasury: Array<{
    avatar: Address;
    amount: bigint;
    amountToRedeem: bigint;
    amountToRedeemInCircles: number;
    trustRelation?: TrustRelationType;
  }> = $state([]);

  // Simple redemption amount input
  let redeemAmountInput = $state('');
  let redeemAmount = $derived(parseFloat(redeemAmountInput) || 0);
  let maxRedeemable = $derived(asset?.circles ?? 0);
  let canRedeem = $derived(
    redeemAmount > 0 &&
    redeemAmount <= maxRedeemable &&
    avatarState.avatar !== null
  );
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  onMount(async () => {
    if (!$circles) return;
    await loadCollateral();
  });

  async function loadCollateral() {
    if (!$circles) return;

    const vaultAddress = await getVaultAddress(
      $circles.rpc,
      asset.tokenOwner
    );

    const treasuryAddress = await getTreasuryAddress(
      $circles.rpc,
      asset.tokenOwner
    );

    const balancesResult = await getGroupCollateral(
      $circles.rpc,
      vaultAddress ?? treasuryAddress ?? ''
    );

    if (!balancesResult) {
      collateralInTreasury = [];
      return;
    }

    // Build display-only table data (no amountToRedeem inputs needed)
    collateralInTreasury = balancesResult.map((row) => ({
      avatar: uint256ToAddress(BigInt(row.tokenId)),
      amount: row.demurragedTotalBalance,
      amountToRedeem: 0n,
      amountToRedeemInCircles: 0,
    }));

    // Enrich with trust relations for display
    Object.entries($contacts.data).map(([_, contact]) => {
      const address = contact.avatarInfo?.avatar;
      const relation = contact.row.relation;

      const item = collateralInTreasury.find((item) => item.avatar === address);
      if (item) {
        item.trustRelation = relation;
      }
    });

    const selfItem = collateralInTreasury.find(
      (item) => item.avatar === avatarState.avatar?.address
    );
    if (selfItem) {
      selfItem.trustRelation = 'mutuallyTrusts';
    }
  }

  async function redeem() {
    if (!avatarState.avatar || !canRedeem) return;

    isLoading = true;
    error = null;

    try {
      // Convert circles amount to wei (18 decimals)
      const amountInWei = parseUnits(redeemAmount.toString(), 18);

      console.log(`Redeeming ${redeemAmount} group tokens (${amountInWei} wei)`);

      // New SDK: automatic pathfinder redemption
      if ('groupToken' in avatarState.avatar && typeof (avatarState.avatar as any).groupToken?.redeem === 'function') {
        await (avatarState.avatar as any).groupToken.redeem(
          asset.tokenOwner,
          amountInWei
        );
        // Clear input on success
        redeemAmountInput = '';
        // Reload collateral to show updated balances
        await loadCollateral();
      } else {
        throw new Error('Group token redemption not available on this avatar type');
      }
    } catch (err) {
      console.error('Redemption failed:', err);
      error = err instanceof Error ? err.message : 'Redemption failed';
    } finally {
      isLoading = false;
    }
  }

  function setMaxAmount() {
    redeemAmountInput = maxRedeemable.toFixed(2);
  }
</script>

<div class="space-y-4">
  <!-- Total redeemable balance -->
  <div class="bg-base-200 rounded-lg p-4">
    <p class="text-sm text-base-content/70">Your redeemable balance</p>
    <p class="text-2xl font-bold">
      {#if maxRedeemable > 0}
        {maxRedeemable.toFixed(2)} CRC
      {:else}
        0 CRC
      {/if}
    </p>
  </div>

  <!-- Redemption input -->
  <div class="form-control">
    <label class="label">
      <span class="label-text">Amount to redeem</span>
      <button
        class="label-text-alt link link-primary"
        onclick={setMaxAmount}
        type="button"
      >
        Max
      </button>
    </label>
    <div class="join w-full">
      <input
        type="number"
        class="input input-bordered join-item flex-1"
        placeholder="0.00"
        bind:value={redeemAmountInput}
        min="0"
        max={maxRedeemable}
        step="0.01"
        disabled={isLoading}
      />
      <span class="btn btn-ghost join-item no-animation">CRC</span>
    </div>
    {#if redeemAmount > maxRedeemable}
      <label class="label">
        <span class="label-text-alt text-error">Amount exceeds available balance</span>
      </label>
    {/if}
  </div>

  <!-- Info about automatic selection -->
  <div class="alert alert-info">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <span>Collateral tokens are selected automatically for optimal redemption paths.</span>
  </div>

  {#if error}
    <div class="alert alert-error">
      <span>{error}</span>
    </div>
  {/if}

  <!-- Redeem button -->
  <div class="flex justify-end">
    <ActionButton
      action={redeem}
      disabled={!canRedeem || isLoading}
    >
      {#if isLoading}
        <span class="loading loading-spinner loading-sm"></span>
        Redeeming...
      {:else}
        Redeem
      {/if}
    </ActionButton>
  </div>

  <!-- Collateral table (read-only display) -->
  {#if collateralInTreasury.length > 0}
    <div class="divider">Available Collateral</div>
    <CollateralTable {collateralInTreasury} redeemable={false} />
  {/if}
</div>
