<script lang="ts">
  import GenericList from '$lib/components/GenericList.svelte';
  import TransactionRow from './TransactionRow.svelte';
  import TotalBalance from '$lib/components/TotalBalance.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { roundToDecimals } from '$lib/utils/shared';
  import { runTask } from '$lib/utils/tasks';
  import { transactionHistory } from '$lib/stores/transactionHistory';
  import { groupMetrics } from '$lib/stores/groupMetrics.svelte';
  import ModernHistoryChart from '$lib/components/ModernHistoryChart.svelte';
  import ModernPieChart from '$lib/components/ModernPieChart.svelte';
  import GroupMetricsStats from '$lib/components/GroupMetricsStats.svelte';

  let mintableAmount: number = $state(0);

  $effect(() => {
    (async () => {
      console.log('avatarState.avatar', avatarState.avatar);
      console.log('avatarState.isGroup', avatarState.isGroup);
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

<div class="flex flex-col items-center w-full max-w-4xl gap-y-6 mt-20">
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
        defaultChecked="true"
        aria-label="Overview"
      />
      <div role="tabpanel" class="tab-content mt-8 bg-base-100 border-none">
        <div class="w-full mb-6">
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-bold text-primary">Group Overview</h2>
          </div>
        </div>

        {#if Object.keys(groupMetrics).length > 0}
          <!-- Stats Overview -->
          <GroupMetricsStats {groupMetrics} />

          <!-- Charts Grid -->
          <div class="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 mt-6">
            {#if groupMetrics.priceHistoryWeek && groupMetrics.priceHistoryMonth}
              <div class="bg-white p-6 rounded-xl border shadow-sm">
                <ModernHistoryChart
                  dataSet1={groupMetrics.priceHistoryWeek}
                  dataSet2={groupMetrics.priceHistoryMonth}
                  title="Price History"
                  label="xDAI"
                />
              </div>
            {/if}

            {#if groupMetrics?.memberCountPerHour && groupMetrics.memberCountPerHour.length > 0 && groupMetrics.memberCountPerDay && groupMetrics.memberCountPerDay.length > 0}
              <div class="bg-white p-6 rounded-xl border shadow-sm">
                <ModernHistoryChart
                  dataSet1={groupMetrics.memberCountPerHour}
                  dataSet2={groupMetrics.memberCountPerDay}
                  title="Member Growth"
                  label="Members"
                />
              </div>
            {/if}

            {#if groupMetrics?.mintRedeemPerHour && groupMetrics.mintRedeemPerHour.length > 0 && groupMetrics.mintRedeemPerDay && groupMetrics.mintRedeemPerDay.length > 0}
              <div class="bg-white p-6 rounded-xl border shadow-sm">
                <ModernHistoryChart
                  dataSet1={groupMetrics.mintRedeemPerHour}
                  dataSet2={groupMetrics.mintRedeemPerDay}
                  title="Mint/Redeem Activity"
                  label="Circles"
                />
              </div>
            {/if}

            {#if groupMetrics?.wrapUnwrapPerHour && groupMetrics.wrapUnwrapPerHour.length > 0 && groupMetrics.wrapUnwrapPerDay && groupMetrics.wrapUnwrapPerDay.length > 0}
              <div class="bg-white p-6 rounded-xl border shadow-sm">
                <ModernHistoryChart
                  dataSet1={groupMetrics.wrapUnwrapPerHour}
                  dataSet2={groupMetrics.wrapUnwrapPerDay}
                  title="Wrap/Unwrap Activity"
                  label="Circles"
                />
              </div>
            {/if}
          </div>

          <!-- Distribution Charts -->
          <div class="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            {#if groupMetrics?.collateralInTreasury && groupMetrics.collateralInTreasury.length > 0}
              <div class="bg-white p-6 rounded-xl border shadow-sm">
                <h2 class="text-lg font-semibold text-gray-800 mb-4">
                  Treasury Collateral
                </h2>
                <ModernPieChart
                  data={groupMetrics.collateralInTreasury}
                  labelKey="avatar"
                  valueKey="amount"
                  title="Treasury Breakdown"
                />
              </div>
            {/if}

            {#if groupMetrics?.tokenHolderBalance && groupMetrics.tokenHolderBalance.length > 0}
              <div class="bg-white p-6 rounded-xl border shadow-sm">
                <h2 class="text-lg font-semibold text-gray-800 mb-4">
                  Token Distribution
                </h2>
                <ModernPieChart
                  data={groupMetrics.tokenHolderBalance}
                  labelKey="holder"
                  valueKey="demurragedTotalBalance"
                  title="Token Holder Distribution"
                />
              </div>
            {/if}
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center h-[50vh]">
            <div class="text-2xl font-bold text-gray-400">
              Loading group metrics...
            </div>
          </div>
        {/if}
      </div>
    {/if}
    <input
      type="radio"
      name="tabs"
      value="transaction-history"
      role="tab"
      class="tab h-auto"
      defaultChecked={!avatarState.isGroup}
      aria-label="Transaction History"
    />
    <div role="tabpanel" class="tab-content mt-8 bg-base-100 border-none">
      <div class="w-full md:border rounded-lg md:px-4">
        <GenericList row={TransactionRow} store={transactionHistory} />
      </div>
    </div>
  </div>
</div>
