<script lang="ts">
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import {
    wallet,
    initNewSafeBrowserRunner,
    getSigner,
    signer,
    GNOSIS_CHAIN_ID_DEC,
  } from '$lib/stores/wallet.svelte';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import { onMount } from 'svelte';
  import { Sdk } from '@aboutcircles/sdk';
  import { gnosisConfig } from '$lib/circlesConfig';
  import { circles } from '$lib/stores/circles';
  import type { Address } from '@aboutcircles/sdk-types';
  import { switchChain, getAccount } from '@wagmi/core';
  import { config } from '../../../config';

  let chainError = $state<string | null>(null);

  async function ensureGnosisChain(): Promise<boolean> {
    // Check actual chainId from MetaMask directly (not wagmi cache)
    const rawChainId = await window.ethereum?.request({ method: 'eth_chainId' });
    // Normalize to hex string (some wallets return number, some hex)
    const currentChainId = typeof rawChainId === 'number'
      ? '0x' + rawChainId.toString(16)
      : String(rawChainId).toLowerCase();

    console.log('[Chain check] Current chain:', currentChainId, 'Expected: 0x64');

    // 0x64 = 100 = Gnosis Chain
    if (currentChainId === '0x64') {
      chainError = null; // Clear any previous error
      return true;
    }

    try {
      // Force MetaMask to switch using direct RPC call
      await window.ethereum?.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x64' }],
      });
      // Give MetaMask a moment to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      chainError = null;
      return true;
    } catch (err: any) {
      console.error('Failed to switch to Gnosis:', err?.message || err?.code || err);
      // 4902 = chain not added to MetaMask
      if (err.code === 4902) {
        chainError = 'Gnosis Chain not found in MetaMask. Please add it manually.';
      } else if (err.code === 4001) {
        chainError = 'User rejected network switch. Please switch to Gnosis Chain manually.';
      } else {
        chainError = 'Please switch MetaMask to Gnosis Chain and refresh the page.';
      }
      return false;
    }
  }

  onMount(async () => {
    try {
      signer.address = await getSigner();
      // Check chain on mount
      await ensureGnosisChain();
    } catch (err) {
      console.error('Failed to get signer:', err);
    }
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
        // Check actual chainId to give better error
        const chainId = await window.ethereum?.request({ method: 'eth_chainId' });
        if (chainId !== '0x64') {
          chainError = `MetaMask is on wrong network (${chainId}). Please switch to Gnosis (0x64) and refresh.`;
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
    <WalletLoader />
    {#if signer.address}
      <p class="muted">Waiting for SDK to initialize...</p>
    {/if}
  {:else}
    <ConnectSafe
      safeOwnerAddress={signer.address}
      initSdk={connectSafe}
      sdk={$circles}
    />
  {/if}
</div>
