<script lang="ts">
  import { getConnectors } from '@wagmi/core';
  import { config } from '../../config';
  import { connect } from '@wagmi/core';
  import { goto } from '$app/navigation';
  import { popupControls } from '$lib/stores/popUp';
  import { signer } from '$lib/stores/wallet.svelte';
  import type { Address } from '@circles-sdk/utils';
  import ImportCircles from './ImportCircles.svelte';
  import { clearSession } from '$lib/stores/wallet.svelte';
  import WalletIcon from './icons/WalletIcon.svelte';
  import KeyIcon from './icons/KeyIcon.svelte';
  
  const connectors = getConnectors(config);
</script>

<div class="max-w-md mx-auto space-y-3">
  {#each connectors as connector}
    <button
      class="w-full bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200 shadow-sm"
      id={connector.id}
      onclick={async () => {
        await clearSession();
        const result = await connect(config, { connector: connector, chainId: 100 });
        localStorage.setItem('connectorId', connector.id);
        signer.address = result.accounts[0].toLowerCase() as Address;
        popupControls.close();
        goto('/connect-wallet/connect-safe/');
      }}
    >
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <WalletIcon size="lg" class="text-gray-600" />
        </div>
        <div class="text-left">
          <div class="font-medium text-gray-900">Use {connector.name}</div>
          <div class="text-sm text-gray-500">
            {#if connector.name.toLowerCase().includes('safe')}
              Use Circles with Safe and MetaMask or any compatible browser wallet
            {:else if connector.name.toLowerCase().includes('metamask')}
              Use Circles with MetaMask or any compatible browser wallet
            {:else}
              Connect with {connector.name}
            {/if}
          </div>
        </div>
      </div>
      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  {/each}

  <button
    class="w-full bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200 shadow-sm"
    onclick={async () => {
      await clearSession();
      popupControls.open({
        component: ImportCircles,
        title: 'Import Circles',
        props: {},
      });
    }}
  >
    <div class="flex items-center space-x-3">
      <div class="w-10 h-10 bg-circles-purple rounded-lg flex items-center justify-center">
        <KeyIcon size="lg" class="text-white" />
      </div>
      <div class="text-left">
        <div class="font-medium text-gray-900">circles.garden</div>
        <div class="text-sm text-gray-500">Use your circles.garden key in Secret-garden</div>
      </div>
    </div>
    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </button>
</div>
