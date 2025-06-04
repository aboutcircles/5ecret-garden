<script lang="ts">
  import type { GroupMetrics } from '$lib/stores/groupMetrics.svelte';

  type Props = {
    groupMetrics: GroupMetrics;
  };

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
        (sum, item) => sum + item.burned,
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

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 w-full gap-4 mb-8">
  <!-- Member Count -->
  <div
    class="flex flex-col justify-between p-6 border rounded-xl bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5"
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
      {memberCount}
      <span class="text-gray-500 text-sm"
        >{memberGrowth > 0 ? '+' : ''}{memberGrowth.toFixed(1)}%</span
      >
    </h2>
    <p class="text-sm text-gray-500">Members</p>
  </div>

  <!-- Total Supply -->
  <div
    class="flex flex-col justify-between p-6 border rounded-xl bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5"
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
    class="flex flex-col justify-between p-6 border rounded-xl bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5"
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
    <p class="text-sm text-gray-500">Minted last 30 days</p>
  </div>

  <!-- Total Redeemed -->
  <div
    class="flex flex-col justify-between p-6 border rounded-xl bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5"
  >
    <div class="w-4 h-4 mb-4 text-primary">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        ><!-- Icon from Solar by 480 Design - https://creativecommons.org/licenses/by/4.0/ --><path
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          d="M12 21c4.418 0 8-3.356 8-7.496c0-3.741-2.035-6.666-3.438-8.06c-.26-.258-.694-.144-.84.189c-.748 1.69-2.304 4.123-4.293 4.123c-1.232.165-3.112-.888-1.594-6.107c.137-.47-.365-.848-.749-.534C6.905 4.905 4 8.511 4 13.504C4 17.644 7.582 21 12 21Z"
        /></svg
      >
    </div>
    <h2
      class="text-3xl tracking-tight font-medium flex flex-row gap-2 items-end"
    >
      {formatNumber(totalRedeemed)}
    </h2>
    <p class="text-sm text-gray-500">Burned last 30 days</p>
  </div>

  <!-- Affiliate Members Count -->
  <div
    class="flex flex-col justify-between p-6 border rounded-xl bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-0.5"
  >
    <div class="w-4 h-4 mb-4 text-primary">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="size-5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
        />
      </svg>
    </div>
    <h2
      class="text-3xl tracking-tight font-medium flex flex-row gap-2 items-end"
    >
      {groupMetrics.affiliateMembersCount}
    </h2>
    <p class="text-sm text-gray-500">Affiliate Members</p>
  </div>
</div>
