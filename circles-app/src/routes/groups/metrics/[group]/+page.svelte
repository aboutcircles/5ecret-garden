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
  import type { Address } from '@circles-sdk/utils';
  import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
  import type { Action } from '$lib/shared/ui/shell/actions';
  import { T } from '$lib/design-system/tokens.js';

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
>
  {#snippet title()}
    <h1 class="h2" style="font-weight:700;color:{T.ink};">Group Metrics</h1>
    <p style="font-size:13px;color:{T.inkMuted};">Analytics and insights for your group</p>
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
    <div style="width:100%;display:grid;grid-template-columns:repeat(2,1fr);gap:24px;margin-bottom:40px;">
      {#if groupMetrics.priceHistoryWeek && groupMetrics.priceHistoryMonth}
        <div style="background:{T.surface};border:1px solid {T.hairlineSoft};padding:24px;border-radius:14px;box-shadow:{T.shadow.xs};">
          <ModernHistoryChart
            dataSet1={groupMetrics.priceHistoryWeek}
            dataSet2={groupMetrics.priceHistoryMonth}
            title="Price History"
            label="xDAI"
          />
        </div>
      {/if}

      {#if groupMetrics?.memberCountPerHour && groupMetrics.memberCountPerHour.length > 0 && groupMetrics.memberCountPerDay && groupMetrics.memberCountPerDay.length > 0}
        <div style="background:{T.surface};border:1px solid {T.hairlineSoft};padding:24px;border-radius:14px;box-shadow:{T.shadow.xs};">
          <ModernHistoryChart
            dataSet1={groupMetrics.memberCountPerHour}
            dataSet2={groupMetrics.memberCountPerDay}
            title="Member Growth"
            label="Members"
          />
        </div>
      {/if}

      {#if groupMetrics?.mintRedeemPerHour && groupMetrics.mintRedeemPerHour.length > 0 && groupMetrics.mintRedeemPerDay && groupMetrics.mintRedeemPerDay.length > 0}
        <div style="background:{T.surface};border:1px solid {T.hairlineSoft};padding:24px;border-radius:14px;box-shadow:{T.shadow.xs};">
          <ModernHistoryChart
            dataSet1={groupMetrics.mintRedeemPerHour}
            dataSet2={groupMetrics.mintRedeemPerDay}
            title="Mint/Burn Activity"
            label="Circles"
          />
        </div>
      {/if}

      {#if groupMetrics?.wrapUnwrapPerHour && groupMetrics.wrapUnwrapPerHour.length > 0 && groupMetrics.wrapUnwrapPerDay && groupMetrics.wrapUnwrapPerDay.length > 0}
        <div style="background:{T.surface};border:1px solid {T.hairlineSoft};padding:24px;border-radius:14px;box-shadow:{T.shadow.xs};">
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
    <div style="width:100%;display:grid;grid-template-columns:repeat(2,1fr);gap:24px;margin-bottom:40px;">
      {#if groupMetrics?.collateralInTreasury && groupMetrics.collateralInTreasury.length > 0}
        <div style="background:{T.surface};border:1px solid {T.hairlineSoft};padding:24px;border-radius:14px;box-shadow:{T.shadow.xs};">
          <h2 style="font-size:16px;font-weight:600;color:{T.ink};margin:0 0 16px 0;">
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
        <div style="background:{T.surface};border:1px solid {T.hairlineSoft};padding:24px;border-radius:14px;box-shadow:{T.shadow.xs};">
          <h2 style="font-size:16px;font-weight:600;color:{T.ink};margin:0 0 16px 0;">
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
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:50vh;">
      <div style="font-size:22px;font-weight:700;color:{T.inkFaint};">
        Loading group metrics...
      </div>
    </div>
  {/if}
</PageScaffold>
