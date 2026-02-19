<script lang="ts">
  import { switchChain } from '@wagmi/core';
  import { config } from '../../../../../config';
  import { popupControls } from '$lib/shared/state/popup';
</script>

<div class="flex items-center justify-center">
  <div class="bg-base-100 border border-base-300 rounded-xl p-4 shadow-sm max-w-md w-full">
    <h1 class="text-xl font-semibold">Wrong network</h1>
    <p class="mt-2 text-sm text-base-content/70">Please switch to the Gnosis Chain to continue.</p>
    <div class="mt-4 flex justify-end">
      <button
        type="button"
        onclick={() => {
          switchChain(config, { chainId: 100 });
          popupControls.close();
        }}
        class="btn btn-primary btn-sm"
      >
        Switch to Gnosis Chain
      </button>
    </div>
  </div>
</div>
