<script lang="ts">
  import {
    fetchGroupMetrics,
    type GroupMetrics,
  } from '$lib/stores/groupMetrics.svelte';
  import { goto } from '$app/navigation';
  import ModernHistoryChart from '$lib/components/ModernHistoryChart.svelte';
  import ModernPieChart from '$lib/components/ModernPieChart.svelte';
  import GroupMetricsStats from '$lib/components/GroupMetricsStats.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import type { PageProps } from './$types';
  import { circles } from '$lib/stores/circles';
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import Lucide from '$lib/icons/Lucide.svelte';
  import { ArrowLeft as LArrowLeft } from 'lucide';
  import type { Address } from '@circles-sdk/utils';

  let groupMetrics: GroupMetrics = $state({});

  let { data }: PageProps = $props();

  $effect(() => {
    if ($circles?.circlesRpc) {
      fetchGroupMetrics(
        $circles.circlesRpc,
        data.group as Address,
        groupMetrics
      );
    }
  });

  function backToDashboard() {
    goto('/dashboard');
  }

  type Action = {
    id: string;
    label: string;
    iconNode: any;
    onClick: () => void;
    variant: 'primary' | 'ghost';
    disabled?: boolean;
  };
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
  <svelte:fragment slot="title">
    <h1 class="h2 font-bold text-gray-800">Group Metrics</h1>
    <p class="text-sm text-gray-500">Analytics and insights for your group</p>
  </svelte:fragment>
  <svelte:fragment slot="meta">
    <Avatar address={data.group as Address} view="horizontal" />
  </svelte:fragment>
  <svelte:fragment slot="actions">
    {#each actions as a (a.id)}
      <button
        type="button"
        class={`btn btn-sm ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`}
        onclick={a.onClick}
        aria-label={a.label}
      >
        <Lucide icon={a.iconNode} size={16} class="shrink-0 stroke-black" />
        <span>{a.label}</span>
      </button>
    {/each}
  </svelte:fragment>
  <svelte:fragment slot="collapsed-menu">
    {#each actions as a (a.id)}
      <button
        type="button"
        class={`btn ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'} min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] w-full justify-start px-3`}
        onclick={a.onClick}
        aria-label={a.label}
      >
        <Lucide
          icon={a.iconNode}
          size={20}
          class={a.variant === 'primary'
            ? 'shrink-0 stroke-white'
            : 'shrink-0 stroke-black'}
        />
        <span>{a.label}</span>
      </button>
    {/each}
  </svelte:fragment>
  {#if Object.keys(groupMetrics).length > 0}
    <!-- Stats Overview -->
    <GroupMetricsStats {groupMetrics} />

    <!-- Charts Grid -->
    <div class="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
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
            title="Mint/Burn Activity"
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
            type="bar"
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
</PageScaffold>
