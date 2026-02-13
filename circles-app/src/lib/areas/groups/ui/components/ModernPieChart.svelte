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
  const colorCache = new Map<string, string>();

  const themeTokens = ['--p', '--s', '--a', '--in', '--su', '--wa', '--er'];

  function resolveThemeColor(token: string, alpha: number): string {
    const key = `${token}:${alpha}`;
    const cached = colorCache.get(key);
    if (cached) return cached;

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      const fallback = `rgba(99, 102, 241, ${alpha})`;
      colorCache.set(key, fallback);
      return fallback;
    }

    const probe = document.createElement('span');
    probe.style.color = `oklch(var(${token}) / ${alpha})`;
    probe.style.position = 'absolute';
    probe.style.pointerEvents = 'none';
    probe.style.opacity = '0';
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color || `rgba(99, 102, 241, ${alpha})`;
    probe.remove();
    colorCache.set(key, resolved);
    return resolved;
  }

  const generateColors = (index: number) => {
    const token = themeTokens[index % themeTokens.length];
    return {
      background: resolveThemeColor(token, 0.25),
      border: resolveThemeColor(token, 1),
    };
  };

  const legendColor = $derived(resolveThemeColor('--bc', 0.75));
  const tooltipBg = $derived(resolveThemeColor('--b1', 0.95));
  const tooltipText = $derived(resolveThemeColor('--bc', 0.9));
  const tooltipBorder = $derived(resolveThemeColor('--b3', 0.6));

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

<div class="rounded-lg overflow-hidden p-4 min-h-[250px]">
  <canvas bind:this={canvas} class="w-full h-full"></canvas>
</div>
