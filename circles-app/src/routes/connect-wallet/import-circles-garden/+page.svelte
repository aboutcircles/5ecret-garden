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
  import type { SdkContractRunner } from '@circles-sdk/adapter';
  import type { Address } from '@circles-sdk/utils';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import SettingsDropdown from '$lib/components/SettingsDropdown.svelte';
  import { circlesConfig } from '$lib/stores/config.svelte';

  let runner: SdkContractRunner | undefined = $state();

  $effect(() => {
    circles.set(
      runner
        ? new Sdk(
            runner,
            circlesConfig.config
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
      address,
      circlesConfig.config.circlesRpcUrl
    );
    wallet.set(runner);

    return new Sdk(
      runner,
      circlesConfig.config
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
    runner = await initPrivateKeyContractRunner(privateKey, circlesConfig.config.circlesRpcUrl);
  });

  $effect(() => {
    circles.set(
      runner
        ? new Sdk(
            runner,
            circlesConfig.config
          )
        : undefined
    );
  });
</script>

<div
  class="w-full flex flex-col items-center min-h-screen max-w-xl gap-y-4 mt-20"
>
  <div class="w-full">
    <button onclick={() => history.back()}>
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </button>
  </div>
  <h2 class="font-bold text-[28px] md:text-[32px]">Select Account</h2>
  <p class="font-normal text-black/60 text-base">
    Please select the account you want to use from the list below.
  </p>
  <div class="flex w-full justify-end">
    <SettingsDropdown />
  </div>
  {#if !signer.address || !$circles}
    <WalletLoader />
  {:else}
    <ConnectSafe
      safeOwnerAddress={signer.address}
      initSdk={connectCirclesGarden}
      sdk={$circles}
    />
  {/if}
</div>
