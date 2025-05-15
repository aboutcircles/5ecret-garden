<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';

  interface Props {
    data: Array<Record<string, any>>;
    labelKey: string;
    valueKey: string;
    title?: string;
  }

  let {
    data,
    labelKey,
    valueKey,
    title = '',
  }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart<'doughnut', number[], string>;
  let chartData: any;

  $effect(() => {
    chartData = {
      labels: data.map((item) => item[labelKey]),
      datasets: [
        {
          label: title || valueKey,
          data: data.map((item) => {
            const raw = item[valueKey];
            return Number(raw);
          }),
          backgroundColor: data.map(
            (_, i) =>
              `rgba(${(i * 60) % 255}, ${(i * 120) % 255}, ${(i * 180) % 255}, 0.2)`
          ),
          borderColor: data.map(
            (_, i) =>
              `rgba(${(i * 60) % 255}, ${(i * 120) % 255}, ${(i * 180) % 255}, 1)`
          ),
          borderWidth: 1,
        },
      ],
    };

    if (chart) {
      chart.data = chartData;
      chart.update();
    }
  });

  onMount(() => {
    chart = new Chart(canvas, {
      type: 'doughnut',
      data: chartData,
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });
  });
</script>

<canvas bind:this={canvas}></canvas>
