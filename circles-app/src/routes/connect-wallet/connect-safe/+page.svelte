<script lang="ts">
  import ConnectSafe from '$lib/areas/wallet/ui/onboarding/ConnectSafe.svelte';
  import {
    wallet,
    initNewSafeBrowserRunner,
    getSigner,
    signer,
    GNOSIS_CHAIN_ID_DEC,
  } from '$lib/shared/state/wallet.svelte';
  import WalletLoader from '$lib/shared/ui/flow/WalletLoader.svelte';
  import { onMount } from 'svelte';
  import { Sdk } from '@aboutcircles/sdk';
  import { gnosisConfig } from '$lib/shared/config/circles';
  import { circles } from '$lib/shared/state/circles';
  import type { Address } from '@aboutcircles/sdk-types';
  import { switchChain, getChainId } from '@wagmi/core';
  import { gnosis } from '@wagmi/core/chains';
  import { config } from '../../../config';
  import { withRetry, isTransientError } from '$lib/shared/utils/retry';
  import { resetConnectionStatus } from '$lib/shared/state/connectionStatus.svelte';

  let chainError = $state<string | null>(null);
  let walletError = $state<string | null>(null);
  let isConnecting = $state(false);

  async function ensureGnosisChain(): Promise<boolean> {
    // Use wagmi's managed provider - avoids Phantom/MetaMask conflicts
    let currentChainId: number;
    try {
      currentChainId = getChainId(config);
    } catch (err) {
      console.warn('[Chain check] getChainId failed, assuming gnosis:', err);
      // If wagmi state isn't ready, assume we're on gnosis (will fail later if not)
      currentChainId = gnosis.id;
    }
    console.log('[Chain check] Current chain:', currentChainId, 'Expected:', gnosis.id);

    if (currentChainId === gnosis.id) {
      chainError = null;
      return true;
    }

    try {
      console.log('[Chain check] Switching to Gnosis...');
      await switchChain(config, { chainId: gnosis.id });
      // Give wallet time to settle after chain switch
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('[Chain check] Switch successful');
      chainError = null;
      return true;
    } catch (err: any) {
      console.error('[Chain check] Failed to switch to Gnosis:', err?.message || err?.code || err);
      if (err.code === 4902) {
        chainError = 'Gnosis Chain not found. Please add it manually.';
      } else if (err.code === 4001) {
        chainError = 'User rejected network switch.';
      } else {
        chainError = 'Please switch to Gnosis Chain and refresh.';
      }
      return false;
    }
  }

  async function connectWallet() {
    isConnecting = true;
    walletError = null;

    try {
      // Use retry logic for wallet connection
      signer.address = await withRetry(
        () => getSigner(),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
          updateConnectionStatus: true,
          statusLabel: 'Wallet',
          isRetryable: (err) => {
            // Don't retry user rejections or "not connected" errors (require user action)
            const code = (err as any).code;
            const message = err.message?.toLowerCase() || '';
            if (code === 4001) return false; // User rejected
            if (code === 4900 || message.includes('not connected')) return false; // Not connected
            return isTransientError(err);
          },
          onRetry: (attempt, error) => {
            console.warn(`[ConnectSafe] Wallet connection failed (attempt ${attempt}/3):`, error.message);
          },
        }
      );

      // Check chain on mount
      await ensureGnosisChain();
    } catch (err: any) {
      console.error('Failed to get signer after retries:', err);
      const code = err.code;
      const message = err.message?.toLowerCase() || '';

      // Detect "Not connected" errors (can come as code 4900 or in error message from ethers)
      const isNotConnected = code === 4900 || message.includes('not connected');

      walletError = code === 4001
        ? 'Connection rejected. Please approve the connection in MetaMask.'
        : isNotConnected
        ? 'MetaMask is not connected. Please unlock MetaMask and connect to this site.'
        : err.message || 'Failed to connect wallet';
      resetConnectionStatus();
    } finally {
      isConnecting = false;
    }
  }

  onMount(() => {
    connectWallet();
  });

  async function connectSafe(safeAddress: Address, _targetAddress?: Address) {
    // Ensure we're on Gnosis before trying to connect
    const onGnosis = await ensureGnosisChain();
    if (!onGnosis) {
      throw new Error('Must be on Gnosis Chain to connect Safe');
    }

    chainError = null; // Clear any previous error

    try {
      // Always create runner with the Safe address
      const runner = await initNewSafeBrowserRunner(safeAddress);
      wallet.set(runner);
      return new Sdk(gnosisConfig.production, runner);
    } catch (err: any) {
      console.error('Failed to connect Safe:', err);
      if (err.message?.includes('SafeProxy contract is not deployed')) {
        // Use wagmi to check chain - avoids wallet extension conflicts
        const currentChainId = getChainId(config);
        if (currentChainId !== gnosis.id) {
          chainError = `Wallet is on wrong network (${currentChainId}). Please switch to Gnosis (100) and refresh.`;
        } else {
          chainError = `Could not connect to Safe. Verify the Safe exists on Gnosis Chain.`;
        }
      } else {
        chainError = err.message || 'Failed to connect Safe';
      }
      return new Sdk(gnosisConfig.production);
    }
  }

  $effect(() => {
    if (signer.address && !$circles) {
      circles.set(new Sdk(gnosisConfig.production));
    } else if (!signer.address) {
      circles.set(undefined);
    }
  });

  // Clear wallet error when we have a valid signer (connection recovered)
  $effect(() => {
    if (signer.address && walletError) {
      walletError = null;
      resetConnectionStatus();
    }
  });

  function goBack(): void {
    history.back();
  }
</script>

<div class="page page-pt page-stack page--lg">
  <div class="toolbar">
    <button type="button" class="back-btn" aria-label="Back" onclick={goBack}>
      <img src="/arrow-left.svg" alt="Back" class="icon mr-4" />
      <h1 class="h2">Select Account</h1>
    </button>
    <div class="flex-grow"></div>
    <!--    <SettingsDropdown />-->
  </div>

  <p class="muted">
    Please select the account you want to use from the list below.
  </p>


  <!-- Only show wallet error if we don't have a valid signer (error is stale otherwise) -->
  {#if walletError && !signer.address}
    <div class="alert alert-error">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{walletError}</span>
      <button class="btn btn-sm" onclick={() => connectWallet()}>Retry</button>
    </div>
  {/if}

  {#if chainError}
    <div class="alert alert-error">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{chainError}</span>
      <button class="btn btn-sm" onclick={() => ensureGnosisChain()}>Switch Network</button>
    </div>
  {/if}

  {#if !signer.address || !$circles}
    {#if isConnecting}
      <WalletLoader />
      <p class="muted text-center">Connecting to MetaMask...</p>
    {:else if walletError}
      <!-- Error state: show message prompting user to retry -->
      <div class="flex flex-col items-center justify-center py-8 text-center">
        <p class="text-base-content/70 mb-4">
          Unable to connect to wallet. Please ensure MetaMask is unlocked and connected to this site.
        </p>
      </div>
    {:else}
      <WalletLoader />
      {#if signer.address}
        <p class="muted">Waiting for SDK to initialize...</p>
      {/if}
    {/if}
  {:else}
    <ConnectSafe
      safeOwnerAddress={signer.address}
      initSdk={connectSafe}
      sdk={$circles}
    />
  {/if}
</div>
