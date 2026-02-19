<script lang="ts">
  // @todo double check
  import { wallet, signer } from '$lib/shared/state/wallet.svelte';
  import Safe from '@safe-global/protocol-kit';
  import type {
    PredictedSafeProps,
    SafeAccountConfig,
    SafeDeploymentConfig,
  } from '@safe-global/protocol-kit';
  import { ethers, BrowserProvider, JsonRpcProvider, Wallet } from 'ethers';
  import { settings } from '$lib/shared/state/settings.svelte';
  import { gnosisConfig } from '$lib/shared/config/circles';
  import { getAccount } from '@wagmi/core';
  import { config } from '../../../../../config';

  let isCreating = $state(false);
  let error: string | null = $state(null);
  let isSignerReady = $state(false);

  let { onsafecreated } = $props();

  $effect(() => {
    isSignerReady = !!signer.address || !!$wallet?.address;
  });

  async function createSafe() {
    isCreating = true;
    error = null;

    const ownerAddress = $wallet?.address || signer.address;
    if (!ownerAddress) {
      error = 'Wallet not connected or invalid type';
      isCreating = false;
      return;
    }

    // Check if we have a private key (imported wallet) or browser wallet
    const hasPrivateKey = !!signer.privateKey;

    try {
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

      let protocolKit;
      let provider;
      let ethersWallet;

      if (hasPrivateKey) {
        // Private key flow (imported seed phrase)
        const rpcUrl = settings.ring
          ? gnosisConfig.rings.circlesRpcUrl
          : gnosisConfig.production.circlesRpcUrl;

        provider = new JsonRpcProvider(rpcUrl);
        ethersWallet = new Wallet(signer.privateKey!, provider);

        protocolKit = await Safe.init({
          provider: rpcUrl,
          signer: signer.privateKey,
          predictedSafe,
        });
      } else {
        // Browser wallet flow (MetaMask, etc.)
        // Use wagmi's connector provider to avoid conflicts with other wallet extensions (Phantom, etc.)
        const account = getAccount(config);
        const wagmiProvider = await account.connector?.getProvider();
        if (!wagmiProvider) {
          throw new Error('No wallet provider available');
        }

        protocolKit = await Safe.init({
          provider: wagmiProvider as any,
          predictedSafe,
          signer: ownerAddress,
        });

        provider = new BrowserProvider(wagmiProvider as any);
      }

      const safeAddress = await protocolKit.getAddress();
      console.log('Safe address:', safeAddress);

      const deploymentTransaction =
        await protocolKit.createSafeDeploymentTransaction();

      if (hasPrivateKey) {
        // Private key flow - send transaction directly
        console.log('Deploying Safe with private key...');
        const txResponse = await ethersWallet!.sendTransaction({
          to: deploymentTransaction.to,
          value: BigInt(deploymentTransaction.value),
          data: deploymentTransaction.data as string,
        });

        console.log('Transaction hash:', txResponse.hash);
        await txResponse.wait();
      } else {
        // Browser wallet flow - use external signer
        const client = await protocolKit.getSafeProvider().getExternalSigner();
        console.log(client, 'this is client value');

        if (!client) {
          throw new Error('Failed to get external signer');
        }

        const network = await provider.getNetwork();

        const txHash = await client.sendTransaction({
          to: deploymentTransaction.to as `0x${string}`,
          value: BigInt(deploymentTransaction.value),
          data: deploymentTransaction.data as `0x${string}`,
          account: client.account!,
          chain: null,
        });

        console.log('Transaction hash:', txHash);
        await provider.waitForTransaction(txHash);
      }

      console.log('Safe deployed successfully');

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
  disabled={isCreating || !isSignerReady}
  onclick={createSafe}
>
  {#if isCreating}
    Creating Safe...
  {:else}
    Create New Safe
  {/if}
</button>
