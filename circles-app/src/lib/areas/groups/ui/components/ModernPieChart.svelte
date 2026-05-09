<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';
  import { T } from '$lib/design-system/tokens.js';

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

  const palette = [
    { bg: 'rgba(88,73,212,0.25)',  border: '#5849D4' },
    { bg: 'rgba(123,168,135,0.25)', border: '#7BA887' },
    { bg: 'rgba(232,137,106,0.25)', border: '#E8896A' },
    { bg: 'rgba(244,210,122,0.25)', border: '#F4D27A' },
    { bg: 'rgba(184,174,234,0.25)', border: '#B8AEEA' },
    { bg: 'rgba(212,120,159,0.25)', border: '#D4789F' },
    { bg: 'rgba(176,112,20,0.25)',  border: '#B07014' },
  ];

  const generateColors = (index: number) => ({
    background: palette[index % palette.length].bg,
    border: palette[index % palette.length].border,
  });

  const legendColor = T.inkMuted;
  const tooltipBg = T.surface;
  const tooltipText = T.inkBody;
  const tooltipBorder = T.hairline;

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
              color: legendColor,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: tooltipText,
            bodyColor: tooltipText,
            borderColor: tooltipBorder,
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

<div style="border-radius:8px;overflow:hidden;padding:16px;min-height:250px;">
  <canvas bind:this={canvas} style="width:100%;height:100%;"></canvas>
</div>
