<script lang="ts">
  import Safe from '@safe-global/protocol-kit';
  import type {
    PredictedSafeProps,
    SafeAccountConfig,
    SafeDeploymentConfig,
  } from '@safe-global/protocol-kit';
  import { onMount } from 'svelte';
  import { ethers } from 'ethers';

  let isCreating = $state(false);
  let error: string | null = $state(null);
  let hasProvider = $state(false);

  let {onsafecreated} = $props();

  onMount(() => {
    hasProvider = typeof window !== 'undefined' && !!(window as any).ethereum;
  });

  async function createSafe() {
    isCreating = true;
    error = null;

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      error = 'No Ethereum provider found. Please connect a wallet.';
      isCreating = false;
      return;
    }

    try {
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await browserProvider.getSigner();
      const ownerAddress = await signer.getAddress();

      const safeAccountConfig: SafeAccountConfig = {
        owners: [ownerAddress],
        threshold: 1,
      };
      console.log(safeAccountConfig);

      const randomSalt = ethers.hexlify(ethers.randomBytes(32));
      const safeDeploymentConfig: SafeDeploymentConfig = {
        saltNonce: randomSalt,
      };

      const predictedSafe: PredictedSafeProps = {
        safeAccountConfig,
        safeDeploymentConfig,
      };
      console.log(predictedSafe);

      const protocolKit = await Safe.init({
        provider: (window as any).ethereum, // Use browser provider
        predictedSafe,
        signer: ownerAddress,
      });

      const safeAddress = await protocolKit.getAddress();
      console.log('Safe address:', safeAddress);

      const deploymentTransaction =
        await protocolKit.createSafeDeploymentTransaction();

      const client = await protocolKit.getSafeProvider().getExternalSigner();
      console.log(client, 'this is client value');

      if (!client) {
        throw new Error('Failed to get external signer');
      }

      const network = await browserProvider.getNetwork();
      const transactionHash = await client.sendTransaction({
        to: deploymentTransaction.to,
        value: BigInt(deploymentTransaction.value),
        data: deploymentTransaction.data as `0x${string}`,
        chainId: network.chainId,
      });

      console.log('Transaction hash:', transactionHash);

      await browserProvider.waitForTransaction(transactionHash.hash);

      const isSafeDeployed = await protocolKit.connect({
        safeAddress,
      });

      if (isSafeDeployed) {
        onsafecreated(safeAddress);
        console.log('Safe created event dispatched:', safeAddress);
      } else {
        throw new Error('Safe deployment failed');
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error creating safe:', err);
    } finally {
      isCreating = false;
    }
  }
</script>

{#if error}
  <div class="text-red-500 m-1">{error}</div>
{/if}

<button
  class="btn btm-nav-xs btn-outline btn-primary"
  class:loading={isCreating}
  disabled={isCreating || !hasProvider}
  onclick={createSafe}
>
  {#if isCreating}
    Creating Safe...
  {:else}
    Create New Safe
  {/if}
</button>
