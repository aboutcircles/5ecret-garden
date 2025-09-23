<script lang="ts">
    import { groupMetrics } from '$lib/stores/groupMetrics.svelte';
    import GroupMetricsStats from '$lib/components/GroupMetricsStats.svelte';
    import ModernHistoryChart from '$lib/components/ModernHistoryChart.svelte';
    import ModernPieChart from '$lib/components/ModernPieChart.svelte';
</script>

<div class="w-full mb-6">
</div>

{#if Object.keys(groupMetrics).length > 0}
    <GroupMetricsStats {groupMetrics} />

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
