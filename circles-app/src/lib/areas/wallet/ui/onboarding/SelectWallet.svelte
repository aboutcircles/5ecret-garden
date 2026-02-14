<script lang="ts">
  import { getConnectors, connect } from '@wagmi/core';
  import { config } from '../../../../../config';
  import { goto } from '$app/navigation';
  import { popupControls } from '$lib/shared/state/popup';
  import { openStep } from '$lib/shared/flow';
  import { signer, clearSession } from '$lib/shared/state/wallet.svelte';
  import type { Address } from '@circles-sdk/utils';
  import ImportCircles from '$lib/areas/wallet/ui/onboarding/ImportCircles.svelte';
  import { CirclesStorage } from '$lib/shared/utils/storage';
  import { setConnectorId } from '$lib/shared/state/connector';
  const connectors = getConnectors(config);

  async function handleConnect(connector: ReturnType<typeof getConnectors>[number]) {
    try {
      await clearSession();
      const result = await connect(config, { connector, chainId: 100 });
      setConnectorId(connector.id);
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
      // If a local private key is already present, reuse it without asking again
      const pk = CirclesStorage.getInstance().privateKey;
      if (pk) {
        popupControls.close();
        goto('/connect-wallet/import-circles-garden');
        return;
      }
      // Otherwise, prompt for the seed phrase
      openStep({
        component: ImportCircles,
        title: 'Use circles magic words',
      });
    }}
  >
    Circles.garden
  </button>
</div>
