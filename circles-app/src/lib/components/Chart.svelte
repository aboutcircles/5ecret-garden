<script lang="ts">
    import { onMount } from 'svelte';
    import Chart from 'chart.js/auto';
  
    const { memberCountPerHour, memberCountPerDay } = $props<{
      memberCountPerHour: { timestamp: Date; count: number }[];
      memberCountPerDay:   { timestamp: Date; count: number }[];
    }>();
  
    let view = $state<'hour' | 'day'>('hour');
  
    let canvas: HTMLCanvasElement;
    let chart: Chart<'line', { x: number; y: number }[]>;
  
    function updateChart() {
      const source = view === 'hour' ? memberCountPerHour : memberCountPerDay;
      const dataPoints = source.map((d: { timestamp: { getTime: () => any; }; count: any; }) => ({
        x: d.timestamp.getTime(),
        y: d.count
      }));
  
      chart.data.datasets = [{
        label: view === 'hour' ? 'Members per hour' : 'Members per day',
        data: dataPoints,
        tension: 0.3,
        borderWidth: 2,
        backgroundColor: 'rgba(75,192,192,0.2)',
        borderColor:    'rgba(75,192,192,1)'
      }];
  
      const xScale: any = chart.options.scales!.x!;
      xScale.type = 'linear';
      xScale.ticks = {
        callback: (value: number) => {
          const d = new Date(value);
          if (view === 'hour') {
            // HH:mm
            return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
          } else {
            // DD/MM
            return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`;
          }
        },
        maxTicksLimit: view === 'hour' ? 12 : 10
      };
      xScale.title.text = view === 'hour' ? 'Hour' : 'Day';
  
      const allT = source.map((d: { timestamp: { getTime: () => any; }; }) => d.timestamp.getTime());
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
              title: { display: true, text: '' }
            },
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Members' }
            }
          },
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
  
      updateChart();
    });
  
    $effect(() => {
      if (chart) updateChart();
    });
  </script>
  
  <style>
    .toggle { margin-bottom: 1rem; }
    button  { margin-right: 0.5rem; }
    canvas  { max-width: 100%; }
  </style>
  
  <div class="toggle">
    <button onclick={() => (view = 'hour')} disabled={view === 'hour'}>
      Hour
    </button>
    <button onclick={() => (view = 'day')} disabled={view === 'day'}>
      Day
    </button>
  </div>
  
  <canvas bind:this={canvas}></canvas>
  