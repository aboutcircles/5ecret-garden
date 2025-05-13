<script lang="ts">
  import GenericList from '$lib/components/GenericList.svelte';
  import TransactionRow from './TransactionRow.svelte';
  import TotalBalance from '$lib/components/TotalBalance.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { roundToDecimals } from '$lib/utils/shared';
  import { runTask } from '$lib/utils/tasks';
  import { transactionHistory } from '$lib/stores/transactionHistory';
  import GroupMetrics from '$lib/components/GroupMetrics.svelte';
  import Chart from '$lib/components/Chart.svelte';
  import { groupMetrics } from '$lib/stores/groupMetrics.svelte';
  import HistoryChart from '$lib/components/HistoryChart.svelte';

  let mintableAmount: number = $state(0);

  $effect(() => {
    (async () => {
      if (avatarState.avatar && !avatarState.isGroup) {
        mintableAmount = (await avatarState.avatar.getMintableAmount()) ?? 0;
      }
    })();
  });

  async function mintPersonalCircles() {
    if (!avatarState.avatar) {
      throw new Error('Avatar store is not available');
    }

    runTask({
      name: 'Minting Circles ...',
      promise: avatarState.avatar.personalMint(),
    }).finally(async () => {
      mintableAmount = (await avatarState.avatar?.getMintableAmount()) ?? 0;
    });

    mintableAmount = 0;
  }
</script>

<div class="flex flex-col items-center w-full max-w-2xl gap-y-6 mt-20">
  <TotalBalance />

  {#if mintableAmount >= 0.01}
    <button class="btn btn-sm btn-primary" onclick={mintPersonalCircles}>
      Mint {roundToDecimals(mintableAmount)} Circles
    </button>
  {/if}
  <div role="tablist" class="tabs tabs-bordered w-full p-0 my-10">
    {#if avatarState.isGroup}
      <input
        type="radio"
        name="tabs"
        value="overview"
        role="tab"
        class="tab h-auto"
        checked
        aria-label="Overview"
      />
      <div role="tabpanel" class="tab-content mt-8 bg-base-100 border-none">
        {#if groupMetrics.priceHistoryWeek && groupMetrics.priceHistoryMonth}
          <div class="divider"></div>
          <h2 class="text-lg text-primary font-bold">Price</h2>
          <HistoryChart
            dataSet1={groupMetrics.priceHistoryWeek}
            dataSet2={groupMetrics.priceHistoryMonth}
            title="Price per hour"
          />
        {/if}
        {#if groupMetrics?.collateralInTreasury && groupMetrics.collateralInTreasury.length > 0}
          <GroupMetrics
            collateralInTreasury={groupMetrics.collateralInTreasury}
          />
        {/if}

        {#if groupMetrics?.memberCountPerHour && groupMetrics.memberCountPerHour.length > 0 && groupMetrics.memberCountPerDay && groupMetrics.memberCountPerDay.length > 0}
          <div class="divider"></div>
          <h2 class="text-lg text-primary font-bold">Member Count</h2>
          <HistoryChart
            dataSet1={groupMetrics.memberCountPerHour}
            dataSet2={groupMetrics.memberCountPerDay}
            title="Member Count"
          />
        {/if}
        {#if groupMetrics?.mintRedeemPerHour && groupMetrics.mintRedeemPerHour.length > 0 && groupMetrics.mintRedeemPerDay && groupMetrics.mintRedeemPerDay.length > 0}
          <div class="divider"></div>
          <h2 class="text-lg text-primary font-bold">Mint/Redeem</h2>
          <HistoryChart
            dataSet1={groupMetrics.mintRedeemPerHour}
            dataSet2={groupMetrics.mintRedeemPerDay}
            title="Mint/Redeem"
          />
        {/if}
      </div>
    {/if}
    <input
      type="radio"
      name="tabs"
      value="transaction-history"
      role="tab"
      class="tab h-auto"
      checked
      aria-label="Transaction History"
    />
    <div role="tabpanel" class="tab-content mt-8 bg-base-100 border-none">
      <div class="w-full md:border rounded-lg md:px-4">
        <GenericList row={TransactionRow} store={transactionHistory} />
      </div>
    </div>
  </div>
</div>
