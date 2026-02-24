<script lang="ts">
  import Safe from '@safe-global/protocol-kit';
  import type {
    PredictedSafeProps,
    SafeAccountConfig,
    SafeDeploymentConfig,
  } from '@safe-global/protocol-kit';
  import { onMount } from 'svelte';
  import { ethers } from 'ethers';
  import { signer as sessionSigner } from '$lib/shared/state/wallet.svelte';
  import { settings } from '$lib/shared/state/settings.svelte';
  import { gnosisConfig } from '$lib/shared/config/circles';

  let isCreating = $state(false);
  let error: string | null = $state(null);
  let hasProvider = $state(false);
  let hasLocalPrivateKey = $derived(!!sessionSigner.privateKey);

  let {
    onsafecreated,
    safeCreationMode = 'browser',
  }: {
    onsafecreated: (address: string) => void;
    safeCreationMode?: 'browser' | 'importedKey';
  } = $props();

  onMount(() => {
    hasProvider = typeof window !== 'undefined' && !!(window as any).ethereum;
  });

  async function createSafe() {
    isCreating = true;
    error = null;

    const privateKey = sessionSigner.privateKey;
    const useLocalPrivateKey = safeCreationMode === 'importedKey';
    if (useLocalPrivateKey && !privateKey) {
      error = 'No imported key available. Please import your circles.garden keyphrase again.';
      isCreating = false;
      return;
    }

    if (!useLocalPrivateKey && (typeof window === 'undefined' || !(window as any).ethereum)) {
      error = 'No Ethereum provider found. Please connect a browser wallet.';
      isCreating = false;
      return;
    }

    try {
      const rpcUrl = settings.ring
        ? gnosisConfig.rings.circlesRpcUrl
        : gnosisConfig.production.circlesRpcUrl;

      const txProvider = useLocalPrivateKey
        ? new ethers.JsonRpcProvider(rpcUrl)
        : new ethers.BrowserProvider((window as any).ethereum);

      const txSigner = useLocalPrivateKey
        ? new ethers.Wallet(privateKey as `0x${string}`, txProvider)
        : await (txProvider as ethers.BrowserProvider).getSigner();

      const ownerAddress = await txSigner.getAddress();

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
        provider: useLocalPrivateKey ? rpcUrl : (window as any).ethereum,
        predictedSafe,
        signer: useLocalPrivateKey ? (privateKey as `0x${string}`) : ownerAddress,
      });

      const safeAddress = await protocolKit.getAddress();
      console.log('Safe address:', safeAddress);

      const deploymentTransaction =
        await protocolKit.createSafeDeploymentTransaction();

      const network = await txProvider.getNetwork();
      const txResponse = await txSigner.sendTransaction({
        to: deploymentTransaction.to,
        value: BigInt(deploymentTransaction.value),
        data: deploymentTransaction.data as `0x${string}`,
        chainId: network.chainId,
      });

      console.log('Transaction hash:', txResponse.hash);

      await txResponse.wait();

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
  disabled={
    isCreating ||
    (safeCreationMode === 'importedKey' ? !hasLocalPrivateKey : !hasProvider)
  }
  onclick={createSafe}
>
  {#if isCreating}
    Creating Safe...
  {:else}
    Create New Safe
  {/if}
</button>
