<script lang="ts">
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import { initializeWallet, wallet } from '$lib/stores/wallet';
  import { circles } from '$lib/stores/circles';
  import { onMount } from 'svelte';
  import { getCirclesConfig } from '$lib/utils/helpers.js';
  import { Sdk } from '@circles-sdk/sdk';

  let initialized: boolean | undefined = $state();

  async function setup() {
    $wallet = await initializeWallet('safe');

    const network = await ($wallet as any).provider?.getNetwork();

    if (!network) {
      throw new Error('Failed to get network');
    }
    const circlesConfig = await getCirclesConfig(network.chainId);

    // Initialize the Circles SDK and set it as $circles to make it globally available.
    $circles = new Sdk($wallet!, circlesConfig);

    localStorage.setItem('walletType', 'safe');
  }

  onMount(async () => {
    $wallet = undefined;
    await setup();
    initialized = true;
  });

</script>

{#if !initialized}
  Loading...
{:else}
  <ConnectSafe safeOwnerAddress={$wallet?.address} chainId={100n} walletType="safe" />
{/if}