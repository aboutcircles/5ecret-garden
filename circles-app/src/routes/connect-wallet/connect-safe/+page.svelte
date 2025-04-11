<script lang="ts">
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import { GNOSIS_CHAIN_ID_DEC, initializeWallet, wallet } from '$lib/stores/wallet';
  import { circles } from '$lib/stores/circles';
  import { onMount } from 'svelte';
  import { getCirclesConfig } from '$lib/utils/helpers.js';
  import { Sdk } from '@circles-sdk/sdk';
  import { switchOrAddGnosisNetwork } from '$lib/utils/network';

  let initialized: boolean | undefined = $state();

  async function setup(callNo = 0) {
    $wallet = await initializeWallet('injected');

    const network = await $wallet.provider?.getNetwork();
    if (!network) {
      throw new Error('Failed to get network');
    }

    if (callNo > 2) {
      return;
    }

    // If we're on the wrong network, attempt to switch
    if (![GNOSIS_CHAIN_ID_DEC].includes(network.chainId)) {
      await switchOrAddGnosisNetwork();
      await setup(callNo++);
      return;
    }

    // Initialize the Circles SDK and set it as $circles to make it globally available.
    const circlesConfig = await getCirclesConfig(network.chainId);
    $circles = new Sdk($wallet!, circlesConfig);
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