<script lang="ts">
  import { groupMetrics } from '$lib/stores/groupMetrics.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import ModernHistoryChart from '$lib/components/ModernHistoryChart.svelte';
  import ModernPieChart from '$lib/components/ModernPieChart.svelte';
  import GroupMetricsStats from '$lib/components/GroupMetricsStats.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';

  onMount(() => {
    if (!avatarState.isGroup) {
      goto('/dashboard');
    }
  });
</script>

<div class="flex flex-col items-center w-full max-w-6xl mx-auto gap-y-6 mt-20 px-4">
  {#if avatarState.isGroup && avatarState.avatar}
    <div class="w-full flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
      <div class="flex items-center gap-4">
        <Avatar address={avatarState.avatar.address} view="horizontal" />
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Group Metrics Dashboard</h1>
          <p class="text-gray-500">Analytics and insights for your group</p>
        </div>
      </div>
      <div class="mt-4 md:mt-0">
        <button 
          class="btn btn-sm btn-outline" 
          onclick={() => goto('/dashboard')}
        >
          Back to Dashboard
        </button>
      </div>
    </div>

    <!-- Stats Overview -->
    <GroupMetricsStats />

    <!-- Charts Grid -->
    <div class="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
      {#if groupMetrics.priceHistoryWeek && groupMetrics.priceHistoryMonth}
        <div class="bg-white p-6 rounded-xl border shadow-sm">
          <ModernHistoryChart
            dataSet1={groupMetrics.priceHistoryWeek}
            dataSet2={groupMetrics.priceHistoryMonth}
            title="Price History"
          />
        </div>
      {/if}

      {#if groupMetrics?.memberCountPerHour && groupMetrics.memberCountPerHour.length > 0 && groupMetrics.memberCountPerDay && groupMetrics.memberCountPerDay.length > 0}
        <div class="bg-white p-6 rounded-xl border shadow-sm">
          <ModernHistoryChart
            dataSet1={groupMetrics.memberCountPerHour}
            dataSet2={groupMetrics.memberCountPerDay}
            title="Member Growth"
          />
        </div>
      {/if}

      {#if groupMetrics?.mintRedeemPerHour && groupMetrics.mintRedeemPerHour.length > 0 && groupMetrics.mintRedeemPerDay && groupMetrics.mintRedeemPerDay.length > 0}
        <div class="bg-white p-6 rounded-xl border shadow-sm">
          <ModernHistoryChart
            dataSet1={groupMetrics.mintRedeemPerHour}
            dataSet2={groupMetrics.mintRedeemPerDay}
            title="Mint/Redeem Activity"
          />
        </div>
      {/if}

      {#if groupMetrics?.wrapUnwrapPerHour && groupMetrics.wrapUnwrapPerHour.length > 0 && groupMetrics.wrapUnwrapPerDay && groupMetrics.wrapUnwrapPerDay.length > 0}
        <div class="bg-white p-6 rounded-xl border shadow-sm">
          <ModernHistoryChart
            dataSet1={groupMetrics.wrapUnwrapPerHour}
            dataSet2={groupMetrics.wrapUnwrapPerDay}
            title="Wrap/Unwrap Activity"
          />
        </div>
      {/if}
    </div>

    <!-- Distribution Charts -->
    <div class="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
      {#if groupMetrics?.collateralInTreasury && groupMetrics.collateralInTreasury.length > 0}
        <div class="bg-white p-6 rounded-xl border shadow-sm">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Treasury Collateral</h2>
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
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Token Distribution</h2>
          <ModernPieChart
            data={groupMetrics.tokenHolderBalance}
            labelKey="holder"
            valueKey="fractionalOwnership"
            title="Token Holder Distribution"
          />
        </div>
      {/if}
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center h-[50vh]">
      <div class="text-2xl font-bold text-gray-400">Loading group metrics...</div>
    </div>
  {/if}
</div>
