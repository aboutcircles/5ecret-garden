<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';

  interface Props {
    dataSet1: Array<Record<string, any> & { timestamp: Date }>;
    dataSet2: Array<Record<string, any> & { timestamp: Date }>;
    title: string;
    label: string;
  }

  let { dataSet1, dataSet2, title, label }: Props = $props();

  let resolution: 'hour' | 'day' = $state('hour');

  let canvas: HTMLCanvasElement;
  let chart: Chart<'line', { x: number; y: number }[]>;

  $effect(() => {
    if (chart) updateChart();
  });

  // Enhanced color generation for better visual appeal
  const generateColors = (index: number) => {
    const baseColors = [
      [56, 49, 139],  // primary
      [64, 82, 214],  // secondary
      [55, 205, 190], // accent
      [111, 79, 179], // purple variant
      [79, 142, 179], // blue variant
      [79, 179, 159]  // teal variant
    ];
    
    const color = baseColors[index % baseColors.length];
    return {
      background: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.1)`,
      border: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`
    };
  };

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
      const colors = generateColors(i);
      return {
        label: key,
        data: pts,
        tension: 0.05,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        backgroundColor: colors.background,
        borderColor: colors.border,
        fill: true,
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
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: '' },
            grid: {
              display: true,
              color: 'rgba(229, 231, 235, 0.5)',
            },
            ticks: {
              padding: 10,
              color: 'rgba(107, 114, 128, 0.7)',
            },
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: label },
            grid: {
              display: true,
              color: 'rgba(229, 231, 235, 0.5)',
            },
            ticks: {
              padding: 10,
              color: 'rgba(107, 114, 128, 0.7)',
            },
          },
        },
        plugins: {
          legend: { 
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
              color: 'rgba(107, 114, 128, 0.9)',
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: 'rgba(17, 24, 39, 0.9)',
            bodyColor: 'rgba(75, 85, 99, 0.9)',
            borderColor: 'rgba(229, 231, 235, 0.5)',
            borderWidth: 1,
            cornerRadius: 8,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              title: (items) => {
                const x = items[0].parsed.x;
                const d = new Date(x);
                return resolution === 'hour'
                  ? `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
                  : `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
              },
            },
          },
        },
        elements: {
          line: {
            tension: 0.3,
            borderWidth: 2,
          },
          point: {
            radius: 0,
            hoverRadius: 6,
          }
        },
      },
    });

    updateChart();
  });
</script>

<div class="relative">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-sm font-medium text-gray-700">{title}</h3>
    <div class="flex items-center">
      <span class="text-xs text-gray-500 mr-2">Day/Hour</span>
      <input
        type="checkbox"
        class="toggle toggle-sm bg-gray-200"
        checked={resolution === 'hour'}
        onclick={({ currentTarget }) => {
          resolution = currentTarget.checked ? 'hour' : 'day';
          updateChart();
        }}
      />
    </div>
  </div>
  
  <div class="rounded-lg overflow-hidden bg-linear-to-br from-transparent via-gray-50/50 to-transparent p-px min-h-[250px]">
    <canvas bind:this={canvas} class="w-full h-full"></canvas>
  </div>
</div>
