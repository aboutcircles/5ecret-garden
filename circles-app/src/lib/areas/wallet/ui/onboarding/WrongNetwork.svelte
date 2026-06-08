<script lang="ts">
  import { switchChain } from '@wagmi/core';
  import { config } from '../../../../../config';
  import { popupControls } from '$lib/shared/state/popup';

  let isSwitching = $state(false);
  let switchError = $state<string | null>(null);

  async function switchToGnosis(): Promise<void> {
    if (isSwitching) return;
    isSwitching = true;
    switchError = null;
    try {
      await switchChain(config, { chainId: 100 });
      popupControls.close();
    } catch (e: any) {
      const message = String(e?.shortMessage ?? e?.message ?? e ?? 'Failed to switch network');
      switchError = message;
    } finally {
      isSwitching = false;
    }
  }
</script>

<div class="flex items-center justify-center">
  <div class="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm max-w-md w-full">
    <h1 class="text-xl font-semibold">Wrong network</h1>
    <p class="mt-2 text-sm text-base-content/70">Please switch to the Gnosis Chain to continue.</p>
    {#if switchError}
      <p class="mt-2 text-xs text-error">{switchError}</p>
    {/if}
    <div class="mt-4 flex justify-end">
      <button
        type="button"
        onclick={switchToGnosis}
        disabled={isSwitching}
        class="btn btn-primary btn-sm"
      >
        {#if isSwitching}
          <span class="loading loading-spinner loading-xs"></span>
        {/if}
        Switch to Gnosis Chain
      </button>
    </div>
  </div>
</div>
