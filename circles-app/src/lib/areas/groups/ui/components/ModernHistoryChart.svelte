<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';

  interface Props {
    dataSet1: Array<Record<string, any> & { timestamp: Date }>;
    dataSet2: Array<Record<string, any> & { timestamp: Date }>;
    title: string;
    label: string;
    type?: 'line' | 'bar';
  }

  let { dataSet1, dataSet2, title, label, type = 'line' }: Props = $props();

  let resolution: 'hour' | 'day' = $state('hour');

  let canvas: HTMLCanvasElement;
  let chart: Chart<'line' | 'bar', { x: number; y: number }[]>;
  const colorCache = new Map<string, string>();

  $effect(() => {
    if (chart) updateChart();
  });

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
      background: resolveThemeColor(token, 0.15),
      border: resolveThemeColor(token, 1),
    };
  };

  const gridColor = $derived(resolveThemeColor('--b3', 0.5));
  const tickColor = $derived(resolveThemeColor('--bc', 0.7));
  const legendColor = $derived(resolveThemeColor('--bc', 0.75));
  const tooltipBg = $derived(resolveThemeColor('--b1', 0.95));
  const tooltipText = $derived(resolveThemeColor('--bc', 0.9));
  const tooltipBorder = $derived(resolveThemeColor('--b3', 0.6));

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
      type: type,
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
              color: gridColor,
            },
            ticks: {
              padding: 10,
              color: tickColor,
            },
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: label },
            grid: {
              display: true,
              color: gridColor,
            },
            ticks: {
              padding: 10,
              color: tickColor,
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
              title: (items) => {
                const x = items[0].parsed.x as number | null;
                if (x == null) return '';
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
    <h3 class="text-sm font-medium text-base-content/80">{title}</h3>
    <div class="flex items-center">
      <span class="text-xs text-base-content/70 mr-2">Day/Hour</span>
      <input
        type="checkbox"
        class="toggle toggle-sm bg-base-300"
        checked={resolution === 'hour'}
        onclick={({ currentTarget }) => {
          resolution = currentTarget.checked ? 'hour' : 'day';
          updateChart();
        }}
      />
    </div>
  </div>
  
  <div class="rounded-lg overflow-hidden bg-gradient-to-br from-transparent via-base-200/40 to-transparent p-px min-h-[250px]">
    <canvas bind:this={canvas} class="w-full h-full"></canvas>
  </div>
</div>
