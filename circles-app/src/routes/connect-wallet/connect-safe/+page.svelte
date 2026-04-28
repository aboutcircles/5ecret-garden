<script lang="ts">
  import ConnectSafe from '$lib/areas/wallet/ui/onboarding/ConnectSafe.svelte';
  import {
    wallet,
    initNewSafeBrowserRunner,
    initNewEoaBrowserRunner,
    getSigner,
    signer,
  } from '$lib/shared/state/wallet.svelte';
  import WalletLoader from '$lib/shared/ui/flow/WalletLoader.svelte';
  import { onMount } from 'svelte';
  import { Sdk } from '@aboutcircles/sdk';
  import { getActiveConfig } from '$lib/shared/state/settings.svelte';
  import { circles } from '$lib/shared/state/circles';
  import type { Address } from '@aboutcircles/sdk-types';
  import { switchChain, getChainId, connect, getConnectors } from '@wagmi/core';
  import { gnosis } from '@wagmi/core/chains';
  import { config } from '../../../config';
  import { resetConnectionStatus } from '$lib/shared/state/connectionStatus.svelte';
  import { getConnectorId, setConnectorId } from '$lib/shared/state/connector';

  let chainError = $state<string | null>(null);
  let walletError = $state<string | null>(null);
  let isConnecting = $state(false);

  async function ensureGnosisChain(): Promise<boolean> {
    // Use wagmi's managed provider - avoids Phantom/MetaMask conflicts
    let currentChainId: number;
    try {
      currentChainId = getChainId(config);
    } catch {
      // wagmi state not ready — assume gnosis (will fail later if not)
      currentChainId = gnosis.id;
    }

    if (currentChainId === gnosis.id) {
      chainError = null;
      return true;
    }

    try {
      await switchChain(config, { chainId: gnosis.id });
      // Give wallet time to settle after chain switch
      await new Promise(resolve => setTimeout(resolve, 300));
      chainError = null;
      return true;
    } catch (err: any) {
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
      // First try silent reconnect (works if wallet was previously connected)
      signer.address = await getSigner();
      await ensureGnosisChain();
    } catch (reconnectErr: any) {
      // Reconnect failed — try interactive connect() with the stored connector
      // This opens the MetaMask popup so the user can approve the connection
      try {
        const storedId = getConnectorId();
        const connectors = getConnectors(config);
        const connector = connectors.find((c) => c.id === storedId)
          ?? connectors.find((c) => c.id === 'injected');

        if (!connector) {
          throw new Error('No wallet connector available. Please start over.');
        }

        const result = await connect(config, { connector, chainId: gnosis.id });
        const addr = result.accounts[0];
        if (typeof addr === 'string' && addr) {
          setConnectorId(connector.id);
          signer.address = addr.toLowerCase() as Address;
          await ensureGnosisChain();
        } else {
          throw new Error('No account returned. Please unlock your wallet and try again.');
        }
      } catch (connectErr: any) {
        const code = connectErr.code;

        walletError = code === 4001
          ? 'Connection rejected. Please approve the connection in your wallet.'
          : connectErr.message || 'Failed to connect wallet';
        resetConnectionStatus();
      }
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
      return new Sdk(getActiveConfig(), runner);
    } catch (err: any) {
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
      return new Sdk(getActiveConfig());
    }
  }

  async function connectEoa(eoaAddress: Address) {
    const onGnosis = await ensureGnosisChain();
    if (!onGnosis) {
      throw new Error('Must be on Gnosis Chain to connect');
    }

    chainError = null;

    try {
      const runner = await initNewEoaBrowserRunner(eoaAddress);
      wallet.set(runner);
      return new Sdk(getActiveConfig(), runner);
    } catch (err: any) {
      chainError = err.message || 'Failed to connect wallet';
      return new Sdk(getActiveConfig());
    }
  }

  $effect(() => {
    if (signer.address && !$circles) {
      circles.set(new Sdk(getActiveConfig()));
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
      <div class="flex flex-col items-center justify-center py-8 text-center">
        <p class="text-sm text-error mb-2">{walletError}</p>
        <p class="text-base-content/70 mb-4">
          Please ensure your wallet is unlocked and connected to this site, then try again.
        </p>
        <div class="flex gap-3">
          <button class="btn btn-sm btn-primary" onclick={() => connectWallet()} disabled={isConnecting}>
            {isConnecting ? 'Reconnecting...' : 'Try again'}
          </button>
          <a href="/" class="btn btn-sm btn-ghost">Start over</a>
        </div>
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
      initEoaSdk={connectEoa}
      sdk={$circles}
    />
  {/if}
</div>
