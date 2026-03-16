<script lang="ts">
  import {
    fetchGroupMetrics,
    type GroupMetrics,
  } from '$lib/areas/groups/state';
  import { goto } from '$app/navigation';
  import ModernHistoryChart from '$lib/areas/groups/ui/components/ModernHistoryChart.svelte';
  import ModernPieChart from '$lib/areas/groups/ui/components/ModernPieChart.svelte';
  import GroupMetricsStats from '$lib/areas/groups/ui/components/GroupMetricsStats.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { PageProps } from './$types';
  import { circles } from '$lib/shared/state/circles';
  import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
  import { ArrowLeft as LArrowLeft } from 'lucide';
  import type { Address } from '@aboutcircles/sdk-types';
  import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
  import type { Action } from '$lib/shared/ui/shell/actions';

  let groupMetrics: GroupMetrics = $state({});

  let { data }: PageProps = $props();

  $effect(() => {
    if ($circles?.rpc) {
      fetchGroupMetrics(
        $circles.rpc,
        data.group as Address,
        groupMetrics
      );
    }
  });

  function backToDashboard() {
    goto('/dashboard');
  }

  const actions: Action[] = [
    {
      id: 'back',
      label: 'Back to Dashboard',
      iconNode: LArrowLeft,
      onClick: backToDashboard,
      variant: 'ghost',
    },
  ];
</script>

<PageScaffold
  highlight="soft"
  collapsedMode="bar"
  collapsedHeightClass="h-12"
  maxWidthClass="page page--lg"
  contentWidthClass="page page--lg"
  usePagePadding={true}
  headerTopGapClass="mt-4 md:mt-6"
  collapsedTopGapClass="mt-3 md:mt-4"
>
  {#snippet title()}
    <h1 class="h2 font-bold text-base-content">Group Metrics</h1>
    <p class="text-sm text-base-content/70">Analytics and insights for your group</p>
  {/snippet}
  {#snippet meta()}
    <Avatar address={data.group} view="horizontal" />
  {/snippet}
  {#snippet headerActions()}
    <ActionButtonBar {actions} />
  {/snippet}
  {#snippet collapsedMenu()}
    <ActionButtonDropDown {actions} />
  {/snippet}
  {#if Object.keys(groupMetrics).length > 0}
    <!-- Stats Overview -->
    <GroupMetricsStats {groupMetrics} />

    <!-- Charts Grid -->
    <div class="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
      {#if groupMetrics.priceHistoryWeek && groupMetrics.priceHistoryMonth}
        <div class="bg-base-100 border border-base-300 p-6 rounded-xl shadow-sm">
          <ModernHistoryChart
            dataSet1={groupMetrics.priceHistoryWeek}
            dataSet2={groupMetrics.priceHistoryMonth}
            title="Price History"
            label="xDAI"
          />
        </div>
      {/if}

      {#if groupMetrics?.memberCountPerHour && groupMetrics.memberCountPerHour.length > 0 && groupMetrics.memberCountPerDay && groupMetrics.memberCountPerDay.length > 0}
        <div class="bg-base-100 border border-base-300 p-6 rounded-xl shadow-sm">
          <ModernHistoryChart
            dataSet1={groupMetrics.memberCountPerHour}
            dataSet2={groupMetrics.memberCountPerDay}
            title="Member Growth"
            label="Members"
          />
        </div>
      {/if}

      {#if groupMetrics?.mintRedeemPerHour && groupMetrics.mintRedeemPerHour.length > 0 && groupMetrics.mintRedeemPerDay && groupMetrics.mintRedeemPerDay.length > 0}
        <div class="bg-base-100 border border-base-300 p-6 rounded-xl shadow-sm">
          <ModernHistoryChart
            dataSet1={groupMetrics.mintRedeemPerHour}
            dataSet2={groupMetrics.mintRedeemPerDay}
            title="Mint/Burn Activity"
            label="Circles"
          />
        </div>
      {/if}

      {#if groupMetrics?.wrapUnwrapPerHour && groupMetrics.wrapUnwrapPerHour.length > 0 && groupMetrics.wrapUnwrapPerDay && groupMetrics.wrapUnwrapPerDay.length > 0}
        <div class="bg-base-100 border border-base-300 p-6 rounded-xl shadow-sm">
          <ModernHistoryChart
            dataSet1={groupMetrics.wrapUnwrapPerHour}
            dataSet2={groupMetrics.wrapUnwrapPerDay}
            title="Wrap/Unwrap Activity"
            label="Circles"
            type="bar"
          />
        </div>
      {/if}
    </div>

    <!-- Distribution Charts -->
    <div class="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
      {#if groupMetrics?.collateralInTreasury && groupMetrics.collateralInTreasury.length > 0}
        <div class="bg-base-100 border border-base-300 p-6 rounded-xl shadow-sm">
          <h2 class="text-lg font-semibold text-base-content mb-4">
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
        <div class="bg-base-100 border border-base-300 p-6 rounded-xl shadow-sm">
          <h2 class="text-lg font-semibold text-base-content mb-4">
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
      <div class="text-2xl font-bold text-base-content/50">
        Loading group metrics...
      </div>
    </div>
  {/if}
</PageScaffold>
