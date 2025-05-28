<script lang="ts">
  import { getConnectors } from '@wagmi/core';
  import { config } from '../../config';
  import { connect } from '@wagmi/core';
  import { goto } from '$app/navigation';
  import { popupControls } from '$lib/stores/popUp';
  import { signer } from '$lib/stores/wallet.svelte';
  import type { Address } from '@circles-sdk/utils';
  const connectors = getConnectors(config);
</script>

<div class="list max-w-md mx-auto">
  {#each connectors as connector}
    <button
      class="list-row flex w-full justify-between items-center btn btn-sm my-2"
      id={connector.id}
      onclick={async () => {
        const result = await connect(config, { connector: connector });
        localStorage.setItem('connectorId', connector.id);
        signer.address = result.accounts[0].toLowerCase() as Address;
        popupControls.close();
        goto('/connect-wallet/connect-safe/');
      }}
    >
      {connector.name}
    </button>
  {/each}

  <button
    class="list-row flex w-full justify-between items-center btn btn-sm my-2"
    onclick={() => {
      goto('/connect-wallet/import-circles-garden');
      popupControls.close();
    }}
  >
    Circles.garden
  </button>
</div>
