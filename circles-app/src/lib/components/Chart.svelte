<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';

  const { dataHour, dataDay } = $props<{
    dataHour: Array<Record<string, any> & { timestamp: Date }>;
    dataDay:  Array<Record<string, any> & { timestamp: Date }>;
  }>();

  let view = $state<'hour' | 'day'>('hour');

  let canvas: HTMLCanvasElement;
  let chart: Chart<'line', { x: number; y: number }[]>;

  const colors = [
    'rgba(54,162,235,0.2)', 'rgba(255,99,132,0.2)',
    'rgba(255,206,86,0.2)',  'rgba(75,192,192,0.2)',
    'rgba(153,102,255,0.2)','rgba(255,159,64,0.2)',
  ];

  function updateChart() {
    const source = view === 'hour' ? dataHour : dataDay;

    const numericKeys = Object.keys(source[0]).filter(k => 
      k !== 'timestamp' && typeof source[0][k] === 'number'
    );

    chart.data.datasets = numericKeys.map((key, i) => ({
      label: key,
      data: source.map((d: { [x: string]: any; timestamp: { getTime: () => any; }; }) => ({ x: d.timestamp.getTime(), y: d[key] })),
      tension: 0.3,
      borderWidth: 2,
      backgroundColor: colors[i % colors.length],
    }));

    const xScale: any = chart.options.scales!.x!;
    xScale.type = 'linear';
    xScale.ticks = {
      callback: (value: number) => {
        const d = new Date(value);
        if (view === 'hour') {
          // HH:mm
          return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        } else {
          // DD/MM
          return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        }
      },
      maxTicksLimit: view === 'hour' ? 12 : 10,
    };
    xScale.title.text = view === 'hour' ? 'Hour' : 'Day';

    const allT = source.map((d: { timestamp: { getTime: () => any } }) =>
      d.timestamp.getTime()
    );
    xScale.min = Math.min(...allT);
    xScale.max = Math.max(...allT);

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
            title: { display: true, text: 'Number' },
          },
        },
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });

    updateChart();
  });

  $effect(() => {
    if (chart) updateChart();
  });
</script>

<fieldset class="fieldset">
  <legend class="fieldset-legend">Day/Hour</legend>
  <label class="label">
    <input
      type="checkbox"
      defaultChecked
      class="toggle"
      checked={view === 'hour'}
      onclick={({ currentTarget }) =>
        (view = currentTarget.checked ? 'hour' : 'day')}
    />
  </label>
</fieldset>

<canvas bind:this={canvas}></canvas>
