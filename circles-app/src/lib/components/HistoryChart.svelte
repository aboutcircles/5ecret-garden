<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';

  interface Props {
    dataSet1: Array<{ bucket: Date; price: number }>;
    dataSet2: Array<{ bucket: Date; price: number }>;
    title: string;
  }

  let { dataSet1, dataSet2, title }: Props = $props();
  let data: Array<{ bucket: Date; price: number }> = $state(dataSet1);

  let resolution: 'hour' | 'day' = $state('hour');

  let canvas: HTMLCanvasElement;
  let chart: Chart<'line', { x: number; y: number }[]>;

  $effect(() => {
    resolution === 'hour' ? (data = dataSet1) : (data = dataSet2);
    if (chart) updateChart();
  });

  function updateChart() {
    const points = data.map((d) => ({
      x: d.bucket.getTime(),
      y: d.price,
    }));

    chart.data = {
      datasets: [
        {
          label: title,
          data: points,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          backgroundColor: 'rgba(54,162,235,0.2)',
          borderColor: 'rgba(54,162,235,1)',
        },
      ],
    };

    const xScale: any = chart.options.scales!.x!;
    const allTs = points.map((p) => p.x);
    xScale.type = 'linear';
    xScale.min = Math.min(...allTs);
    xScale.max = Math.max(...allTs);
    xScale.ticks = {
      stepSize: resolution === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
      callback: (v: number) => {
        const d = new Date(v);
        return resolution === 'hour'
          ? `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
          : `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      },
    };
    xScale.title.text = resolution === 'hour' ? 'Hour' : 'Day';

    chart.update();
  }

  onMount(() => {
    chart = new Chart(canvas, {
      type: 'line',
      data: { datasets: [] },
      options: {
        responsive: true,
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: '' },
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Price' },
          },
        },
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });

    updateChart();
  });
</script>

<div class="flex items-center">
  <p class="font-semibold mr-2">Day/Hour</p>
  <input
    type="checkbox"
    defaultChecked
    class="toggle toggle-sm"
    checked={resolution === 'hour'}
    onclick={({ currentTarget }) =>
      (resolution = currentTarget.checked ? 'hour' : 'day')}
  />
</div>

<canvas bind:this={canvas}></canvas>
