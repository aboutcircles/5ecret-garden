<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';
  import { T } from '$lib/design-system/tokens.js';

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

<div style="position:relative;">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
    <h3 style="font-size:13px;font-weight:500;color:{T.inkBody};margin:0;">{title}</h3>
    <div style="display:flex;align-items:center;">
      <span style="font-size:11px;color:{T.inkMuted};margin-right:8px;">Day/Hour</span>
      <input
        type="checkbox"
        style="width:32px;height:18px;accent-color:{T.primary};"
        checked={resolution === 'hour'}
        onclick={({ currentTarget }) => {
          resolution = currentTarget.checked ? 'hour' : 'day';
          updateChart();
        }}
      />
    </div>
  </div>

  <div style="border-radius:10px;overflow:hidden;background:{T.pageDeep};min-height:250px;">
    <canvas bind:this={canvas} style="width:100%;height:100%;"></canvas>
  </div>
</div>
