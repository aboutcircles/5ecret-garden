<script lang="ts">
  import { getConnectors } from '@wagmi/core';
  import { config } from '../../config';
  import { connect } from '@wagmi/core';
  import { goto } from '$app/navigation';
  import { popupControls } from '$lib/stores/popUp';
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
        popupControls.close();
        goto('/connect-wallet/connect-safe/');
      }}
    >
      {connector.name}
    </button>
  {/each}
</div>
