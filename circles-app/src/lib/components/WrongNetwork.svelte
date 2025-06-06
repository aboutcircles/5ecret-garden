<script lang="ts">
  import { switchChain } from '@wagmi/core';
  import { config } from '../../config';
  import { popupControls } from '$lib/stores/popUp';
</script>

<div
  class="flex items-center justify-center"
>
  <div class="bg-white p-8 rounded-lg">
    <h1 class="text-2xl font-bold">Wrong Network</h1>
    <p class="mt-4">Please switch to the correct network to continue.</p>
    <button
      onclick={() => {
        switchChain(config, { chainId: 100 });
        popupControls.close();
      }}
      class="btn btn-primary"
    >
      Switch to Gnosis Chain
    </button>
  </div>
</div>
