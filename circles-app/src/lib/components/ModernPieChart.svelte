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
      background: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.2)`,
      border: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`
    };
  };

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
          backgroundColor: data.map((_, i) => generateColors(i).background),
          borderColor: data.map((_, i) => generateColors(i).border),
          borderWidth: 1,
          borderRadius: 4,
          hoverOffset: 8
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
        maintainAspectRatio: false,
        cutout: '70%',
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
              label: function(context) {
                const label = context.label || '';
                const value = context.formattedValue;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = Math.round((context.parsed / total) * 100);
                return `${value} (${percentage}%)`;
              }
            }
          }
        },
      },
    });
  });
</script>

<div class="rounded-lg overflow-hidden p-4 min-h-[250px]">
  <canvas bind:this={canvas} class="w-full h-full"></canvas>
</div>
