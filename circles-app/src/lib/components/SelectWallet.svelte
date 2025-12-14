<script lang="ts">
  import { getConnectors, connect } from '@wagmi/core';
  import { config } from '../../config';
  import { goto } from '$app/navigation';
  import { popupControls } from '$lib/stores/popup';
  import { signer, clearSession } from '$lib/stores/wallet.svelte';
  import type { Address } from '@circles-sdk/utils';
  import ImportCircles from './ImportCircles.svelte';
  const connectors = getConnectors(config);

  async function handleConnect(connector: ReturnType<typeof getConnectors>[number]) {
    try {
      await clearSession();
      const result = await connect(config, { connector, chainId: 100 });
      localStorage.setItem('connectorId', connector.id);
      // Safely set signer address only if an account is returned
      const addr0 = (result as any)?.accounts?.[0];
      if (typeof addr0 === 'string' && addr0) {
        signer.address = addr0.toLowerCase() as Address;
      } else {
        console.warn('No account returned by connector', connector?.id, result);
      }
      popupControls.close();
      goto('/connect-wallet/connect-safe/');
    } catch (e) {
      console.error('Wallet connect failed', e);
      // keep popup open so user can retry
    }
  }
</script>

<div class="list max-w-md mx-auto">
  {#each connectors as connector}
    <button
      class="list-row flex w-full justify-between items-center btn btn-sm my-2"
      id={connector.id}
      onclick={() => handleConnect(connector)}
    >
      {connector.name}
    </button>
  {/each}

  <button
    class="list-row flex w-full justify-between items-center btn btn-sm my-2"
    onclick={async () => {
      await clearSession();
      popupControls.open({
        component: ImportCircles,
        title: 'Use circles magic words',
        props: {},
      });
    }}
  >
    Circles.garden
  </button>
</div>
