<script lang="ts">
  import { connectionStatus } from '$lib/shared/state/connectionStatus.svelte';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide';

  // Countdown timer for next retry
  let countdown = $state(0);
  let countdownInterval: ReturnType<typeof setInterval> | null = null;

  $effect(() => {
    // Clear any existing interval
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    if (connectionStatus.status === 'retrying') {
      countdown = Math.ceil(connectionStatus.nextRetryMs / 1000);
      countdownInterval = setInterval(() => {
        countdown = Math.max(0, countdown - 1);
      }, 1000);
    }

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  });
</script>

{#if connectionStatus.status === 'connecting'}
  <div class="alert alert-info shadow-lg animate-pulse">
    <Lucide icon={Wifi} size={20} class="animate-pulse" />
    <div>
      <h3 class="font-bold text-sm">Connecting...</h3>
      {#if connectionStatus.message}
        <p class="text-xs opacity-80">{connectionStatus.message}</p>
      {/if}
    </div>
  </div>
{:else if connectionStatus.status === 'retrying'}
  <div class="alert alert-warning shadow-lg">
    <Lucide icon={RefreshCw} size={20} class="animate-spin" />
    <div class="flex-1">
      <h3 class="font-bold text-sm">
        Connection interrupted - Retrying ({connectionStatus.attempt}/{connectionStatus.maxAttempts})
      </h3>
      <p class="text-xs opacity-80">
        {connectionStatus.error}
      </p>
      {#if countdown > 0}
        <p class="text-xs mt-1">
          Next attempt in {countdown}s...
        </p>
      {/if}
    </div>
    <div class="flex-none">
      <div class="radial-progress text-warning text-xs" style="--value:{(connectionStatus.attempt / connectionStatus.maxAttempts) * 100}; --size:2.5rem; --thickness:3px;">
        {connectionStatus.attempt}/{connectionStatus.maxAttempts}
      </div>
    </div>
  </div>
{:else if connectionStatus.status === 'failed'}
  <div class="alert alert-error shadow-lg">
    <Lucide icon={WifiOff} size={20} />
    <div>
      <h3 class="font-bold text-sm">Connection Failed</h3>
      <p class="text-xs opacity-80">{connectionStatus.error}</p>
    </div>
    <div class="flex-none">
      <button class="btn btn-sm btn-ghost" onclick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  </div>
{/if}
