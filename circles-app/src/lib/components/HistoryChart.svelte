<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';

  interface Props {
    dataSet1: Array<Record<string, any> & { timestamp: Date }>;
    dataSet2: Array<Record<string, any> & { timestamp: Date }>;
    title: string;
  }

  let { dataSet1, dataSet2, title }: Props = $props();

  let resolution: 'hour' | 'day' = $state('hour');

  let canvas: HTMLCanvasElement;
  let chart: Chart<'line', { x: number; y: number }[]>;

  $effect(() => {
    if (chart) updateChart();
  });

  function updateChart() {
    const src = resolution === 'hour' ? dataSet1 : dataSet2;

    const keys = src.length
      ? Object.keys(src[0]).filter(
          (k) => k !== 'timestamp' && typeof src[0][k] === 'number'
        )
      : [];

    let allTs: number[] = [];

    chart.data.datasets = keys.map((key, i) => {
      const pts = src.map((d) => ({
        x: d.timestamp.getTime(),
        y: d[key],
      }));
      allTs.push(...pts.map((p) => p.x));
      return {
        label: title ? `${title} – ${key}` : key,
        data: pts,
        tension: 0.05,
        borderWidth: 2,
        pointRadius: 0,
        backgroundColor: `rgba(${(i * 60) % 255}, ${(i * 120) % 255}, ${(i * 180) % 255},0.2)`,
        borderColor: `rgba(${(i * 60) % 255}, ${(i * 120) % 255}, ${(i * 180) % 255},1)`,
      };
    });

    const x: any = chart.options.scales!.x!;
    x.type = 'linear';
    if (allTs.length) {
      x.min = Math.min(...allTs);
      x.max = Math.max(...allTs);
    }
    x.ticks = {
      stepSize: resolution === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
      callback: (val: number) => {
        const d = new Date(val);
        return resolution === 'hour'
          ? `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
          : `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      },
    };
    x.title.text = resolution === 'hour' ? 'Hour' : 'Day';

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
    onclick={({ currentTarget }) => {
      resolution = currentTarget.checked ? 'hour' : 'day';
      updateChart();
    }}
  />
</div>

<canvas bind:this={canvas}></canvas>
