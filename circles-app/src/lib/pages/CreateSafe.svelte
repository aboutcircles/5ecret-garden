<script lang="ts">
  import { wallet } from '$lib/stores/wallet';
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
  let isWalletReady = $state(false);

  let {onsafecreated} = $props();

  onMount(() => {
    isWalletReady = !!$wallet;
  });

  async function createSafe() {
    isCreating = true;
    error = null;

    if (!$wallet?.address) {
      error = 'Wallet not connected or invalid type';
      isCreating = false;
      return;
    }

    try {
      const safeAccountConfig: SafeAccountConfig = {
        owners: [$wallet.address],
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
        provider: window.ethereum, // Use browserProvider
        predictedSafe,
        signer: $wallet.address,
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

      const transactionHash = await client.sendTransaction({
        to: deploymentTransaction.to,
        value: BigInt(deploymentTransaction.value),
        data: deploymentTransaction.data as `0x${string}`,
        chainId: (await $wallet.provider.getNetwork()).chainId,
      });

      console.log('Transaction hash:', transactionHash);

      await $wallet.provider.waitForTransaction(transactionHash.hash);

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
  disabled={isCreating || !isWalletReady}
  onclick={createSafe}
>
  {#if isCreating}
    Creating Safe...
  {:else}
    Create New Safe
  {/if}
</button>
