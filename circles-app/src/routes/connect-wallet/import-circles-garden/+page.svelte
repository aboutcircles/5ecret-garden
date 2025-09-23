<script lang="ts">
  import {
    clearSession,
    getSignerFromPk,
    initPrivateKeyContractRunner,
    initSafeSdkPrivateKeyContractRunner,
    signer,
    wallet,
  } from '$lib/stores/wallet.svelte';
  import { circles } from '$lib/stores/circles';
  import { Sdk } from '@circles-sdk/sdk';
  import { onMount } from 'svelte';
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { gnosisConfig } from '$lib/circlesConfig';
  import type { SdkContractRunner } from '@circles-sdk/adapter';
  import type { Address } from '@circles-sdk/utils';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import SettingsDropdown from '$lib/components/SettingsDropdown.svelte';

  let runner: SdkContractRunner | undefined = $state();

  $effect(() => {
    circles.set(
      runner
        ? new Sdk(
            runner,
            settings.ring ? gnosisConfig.rings : gnosisConfig.production
          )
        : undefined
    );
  });

  async function connectCirclesGarden(address: Address) {
    if (!signer.privateKey) {
      throw new Error('No private key found');
    }
    runner = await initSafeSdkPrivateKeyContractRunner(
      signer.privateKey,
      address
    );
    wallet.set(runner);

    return new Sdk(
      runner,
      settings.ring ? gnosisConfig.rings : gnosisConfig.production
    );
  }

  onMount(async () => {
    const { address, privateKey } = (await getSignerFromPk()) ?? {};
    if (!address || !privateKey) {
      await clearSession();
      return;
    }

    signer.address = address;
    signer.privateKey = privateKey;
    runner = await initPrivateKeyContractRunner(privateKey);
  });

  function goBack(): void {
    history.back();
  }
</script>

<div class="page page-pt page-stack page--md">
  <div class="toolbar">
    <button type="button" class="back-btn" aria-label="Back" onclick={goBack}>
      <img src="/arrow-left.svg" alt="Back" class="icon" />
    </button>
    <div class="flex-grow"></div>
    <SettingsDropdown />
  </div>

  <h1 class="h2">Select Account</h1>
  <p class="muted">Please select the account you want to use from the list below.</p>

  {#if !signer.address || !$circles}
    <WalletLoader />
  {:else if $circles}
    <ConnectSafe
      safeOwnerAddress={signer.address}
      initSdk={connectCirclesGarden}
      sdk={$circles}
    />
  {/if}
</div>
