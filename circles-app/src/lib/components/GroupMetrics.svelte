<script lang="ts">
  import { onMount } from 'svelte';
  import Chart, { type ChartItem } from 'chart.js/auto';
  import type { Address } from '@circles-sdk/utils';
  import { formatEther } from 'ethers/utils';

  interface Props {
    collateralInTreasury: Array<{
      avatar: Address;
      amount: bigint;
    }>;
    memberCountPerHour: {
      timestamp: Date;
      count: number;
    }[];
    memberCountPerDay: {
      timestamp: Date;
      count: number;
    }[];
  }

  let { collateralInTreasury, memberCountPerHour, memberCountPerDay }: Props = $props();

  let collateralCanvas: ChartItem;
  let memberPerHourCanvas: ChartItem;
  let collateralChart: Chart<'doughnut', number[], string>;
  let memberPerHourChart: Chart<'line', number[], string>;
  let collateralData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
      borderWidth: number;
    }[];
  };
  let memberPerHourData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
      borderWidth: number;
    }[];
  };

  $effect(() => {
    collateralData = {
      labels: collateralInTreasury.map((item) => item.avatar),
      datasets: [
        {
          label: 'tokens',
          data: collateralInTreasury.map((item) =>
            Number(formatEther(item.amount))
          ),
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(255, 159, 64, 0.2)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
    memberPerHourData = {
      labels: memberCountPerHour.map((item) => item.timestamp.toString()),
      datasets: [
        {
          label: 'Members per hour',
          data: memberCountPerHour.map((item) => item.count),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };

    if (collateralChart) {
      collateralChart.data = collateralData;
      collateralChart.update();
    }
    if (memberPerHourChart) {
      memberPerHourChart.data = memberPerHourData;
      memberPerHourChart.update();
    }
  });

  onMount(() => {
    collateralChart = new Chart(collateralCanvas, {
      type: 'doughnut',
      data: collateralData,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    });

    memberPerHourChart = new Chart(memberPerHourCanvas, {
      type: 'line',
      data: memberPerHourData,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
        },
      },
    });
  });
</script>

<canvas bind:this={collateralCanvas}></canvas>
<canvas bind:this={memberPerHourCanvas}></canvas>
