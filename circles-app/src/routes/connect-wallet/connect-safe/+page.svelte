<script lang="ts">
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import {
    wallet,
    initNewSafeBrowserRunner,
    getSigner,
    signer,
  } from '$lib/stores/wallet.svelte';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import { onMount } from 'svelte';
  import { Sdk } from '@aboutcircles/sdk';
  import { gnosisConfig } from '$lib/circlesConfig';
  import { circles } from '$lib/stores/circles';
  import type { Address } from '@aboutcircles/sdk-types';

  onMount(async () => {
    try {
      signer.address = await getSigner();
    } catch (err) {
      console.error('Failed to get signer:', err);
    }
  });

  async function connectSafe(safeAddress: Address, _targetAddress?: Address) {
    // Always create runner with the Safe address
    const runner = await initNewSafeBrowserRunner(safeAddress);
    wallet.set(runner);
    return new Sdk(gnosisConfig.production, runner);
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
