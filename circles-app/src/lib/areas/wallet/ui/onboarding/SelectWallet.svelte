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
      const addr0 = (result as any)?.accounts?.[0];
      if (typeof addr0 === 'string' && addr0) {
        signer.address = addr0.toLowerCase() as Address;
      } else {
        console.warn('No account returned by connector', connector?.id, result);
      }
      popupControls.closeAndThen(() => {
        void goto('/connect-wallet/connect-safe/');
      });
    } catch (e) {
      console.error('Wallet connect failed', e);
    }
  }
</script>

<div class="flex flex-col gap-2 py-1">
  {#each connectors as connector}
    <button
      id={connector.id}
      onclick={() => handleConnect(connector)}
      class="flex w-full items-center gap-3 px-4 py-3.5 rounded-[14px] border border-base-300 bg-base-100 hover:bg-base-200 transition-colors text-left"
    >
      <span class="font-medium text-base-content">{connector.name}</span>
    </button>
  {/each}

  <button
    class="flex w-full items-center gap-3 px-4 py-3.5 rounded-[14px] border border-base-300 bg-base-100 hover:bg-base-200 transition-colors text-left"
    onclick={async () => {
      const pk = CirclesStorage.getInstance().privateKey;
      if (pk) {
        popupControls.closeAndThen(() => {
          void goto('/connect-wallet/import-circles-garden');
        });
        return;
      }
      openStep({
        component: ImportCircles,
        title: 'Use circles magic words',
      });
    }}
  >
    <div class="flex flex-col gap-0.5">
      <span class="font-medium text-base-content">Circles.garden</span>
      <span class="text-xs text-base-content/50">Import with seed phrase</span>
    </div>
  </button>
</div>
