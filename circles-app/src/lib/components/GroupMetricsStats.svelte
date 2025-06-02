<script lang="ts">
  import type { GroupMetrics } from "$lib/stores/groupMetrics.svelte";

  type Props = {
    groupMetrics: GroupMetrics
  }

  let { groupMetrics }: Props = $props();

  // Calculate stats from group metrics
  $effect(() => {
    calculateStats();
  });

  let memberCount = $state(0);
  let memberGrowth = $state(0);
  let totalSupply = $state(0);
  let supplyGrowth = $state(0);
  let totalMinted = $state(0);
  let totalRedeemed = $state(0);

  function calculateStats() {
    // Calculate member count and growth
    if (
      groupMetrics.memberCountPerDay &&
      groupMetrics.memberCountPerDay.length > 0
    ) {
      const latestCount =
        groupMetrics.memberCountPerDay[
          groupMetrics.memberCountPerDay.length - 1
        ];
      memberCount = latestCount.count;

      if (groupMetrics.memberCountPerDay.length > 1) {
        const previousCount =
          groupMetrics.memberCountPerDay[
            groupMetrics.memberCountPerDay.length - 2
          ];
        const growth = latestCount.count - previousCount.count;
        memberGrowth =
          previousCount.count > 0 ? (growth / previousCount.count) * 100 : 0;
      }
    }

    // Calculate total supply and growth
    if (
      groupMetrics.mintRedeemPerDay &&
      groupMetrics.mintRedeemPerDay.length > 0
    ) {
      const latestSupply =
        groupMetrics.mintRedeemPerDay[groupMetrics.mintRedeemPerDay.length - 1];
      totalSupply = latestSupply.supply;

      if (groupMetrics.mintRedeemPerDay.length > 1) {
        const previousSupply =
          groupMetrics.mintRedeemPerDay[
            groupMetrics.mintRedeemPerDay.length - 2
          ];
        const growth = latestSupply.supply - previousSupply.supply;
        supplyGrowth =
          previousSupply.supply > 0
            ? (growth / previousSupply.supply) * 100
            : 0;
      }

      // Calculate total minted and redeemed
      totalMinted = groupMetrics.mintRedeemPerDay.reduce(
        (sum, item) => sum + item.minted,
        0
      );
      totalRedeemed = groupMetrics.mintRedeemPerDay.reduce(
        (sum, item) => sum + item.redeemed,
        0
      );
    }
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else {
      return num.toFixed(1);
    }
  }
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full gap-4 mb-8">
  <!-- Member Count -->
  <div
    class="flex flex-col justify-between p-6 border border-base-300 rounded-xl bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5"
  >
    <div class="w-4 h-4 mb-4 text-primary">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    </div>
    <h2
      class="text-3xl tracking-tight font-medium flex flex-row gap-2 items-end"
    >
      {formatNumber(memberCount)}
      <span class="text-gray-500 text-sm"
        >{memberGrowth > 0 ? '+' : ''}{memberGrowth.toFixed(1)}%</span
      >
    </h2>
    <p class="text-sm text-gray-500">Members</p>
  </div>

  <!-- Total Supply -->
  <div
    class="flex flex-col justify-between p-6 border border-base-300 rounded-xl bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5"
  >
    <div class="w-4 h-4 mb-4 text-secondary">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    </div>
    <h2
      class="text-3xl tracking-tight font-medium flex flex-row gap-2 items-end"
    >
      {formatNumber(totalSupply)}
      <span class="text-gray-500 text-sm"
        >{supplyGrowth > 0 ? '+' : ''}{supplyGrowth.toFixed(1)}%</span
      >
    </h2>
    <p class="text-sm text-gray-500">Total Supply</p>
  </div>

  <!-- Total Minted -->
  <div
    class="flex flex-col justify-between p-6 border border-base-300 rounded-xl bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5"
  >
    <div class="w-4 h-4 mb-4 text-accent">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="1 4 1 10 7 10"></polyline>
        <polyline points="23 20 23 14 17 14"></polyline>
        <path
          d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"
        ></path>
      </svg>
    </div>
    <h2
      class="text-3xl tracking-tight font-medium flex flex-row gap-2 items-end"
    >
      {formatNumber(totalMinted)}
    </h2>
    <p class="text-sm text-gray-500">Total Minted</p>
  </div>

  <!-- Total Redeemed -->
  <div
    class="flex flex-col justify-between p-6 border border-base-300 rounded-xl bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5"
  >
    <div class="w-4 h-4 mb-4 text-primary">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
        ></path>
      </svg>
    </div>
    <h2
      class="text-3xl tracking-tight font-medium flex flex-row gap-2 items-end"
    >
      {formatNumber(totalRedeemed)}
    </h2>
    <p class="text-sm text-gray-500">Total Redeemed</p>
  </div>
</div>
