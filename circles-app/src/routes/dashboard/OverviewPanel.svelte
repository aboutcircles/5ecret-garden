<script lang="ts">
    import { fetchGroupMetrics, groupMetrics } from '$lib/areas/groups/state';
    import GroupMetricsStats from '$lib/areas/groups/ui/components/GroupMetricsStats.svelte';
    import ModernHistoryChart from '$lib/areas/groups/ui/components/ModernHistoryChart.svelte';
    import ModernPieChart from '$lib/areas/groups/ui/components/ModernPieChart.svelte';
    import { T } from '$lib/design-system/tokens.js';
    import { circles } from '$lib/shared/state/circles';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import type { Address } from '@circles-sdk/utils';

    function retryMetrics() {
        if (!$circles?.circlesRpc || !avatarState.avatar?.address) return;
        void fetchGroupMetrics($circles.circlesRpc, avatarState.avatar.address as Address, groupMetrics);
    }

    const hasData = $derived(
        !!groupMetrics.memberCountPerHour ||
        !!groupMetrics.mintRedeemPerHour ||
        !!groupMetrics.tokenHolderBalance ||
        !!groupMetrics.collateralInTreasury,
    );
</script>

<div style="width:100%;margin-bottom:24px;"></div>

{#if groupMetrics.loading === false && groupMetrics.errors?.length && !hasData}
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;height:50vh;padding:24px;text-align:center;">
        <div style="font-size:15px;font-weight:600;color:{T.ink};">Couldn't load group metrics</div>
        <div style="font-size:12.5px;color:{T.inkMuted};max-width:380px;line-height:1.5;">
            {groupMetrics.errors[0]}
        </div>
        <button
            type="button"
            onclick={retryMetrics}
            style="height:36px;padding:0 16px;border-radius:9999px;background:{T.primary};color:#fff;border:0;cursor:pointer;font-family:{T.fontSans};font-size:13px;font-weight:540;"
        >Retry</button>
    </div>
{:else if hasData}
    <GroupMetricsStats {groupMetrics} />

    <div style="width:100%;display:grid;grid-template-columns:repeat(2,1fr);gap:24px;margin-bottom:40px;margin-top:24px;">
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
                        title="Mint/Redeem Activity"
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
                />
            </div>
        {/if}
    </div>

    <div style="width:100%;display:grid;grid-template-columns:repeat(2,1fr);gap:24px;margin-bottom:40px;">
        {#if groupMetrics?.collateralInTreasury && groupMetrics.collateralInTreasury.length > 0}
            <div style="background:{T.surface};border:1px solid {T.hairlineSoft};padding:24px;border-radius:14px;box-shadow:{T.shadow.xs};">
                <h2 style="font-size:16px;font-weight:600;color:{T.ink};margin:0 0 16px 0;">Treasury Collateral</h2>
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
                <h2 style="font-size:16px;font-weight:600;color:{T.ink};margin:0 0 16px 0;">Token Distribution</h2>
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
