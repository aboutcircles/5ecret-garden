<script lang="ts">
  import { initializeWallet, wallet } from '$lib/stores/wallet';
  import { circles } from '$lib/stores/circles';
  import { Sdk } from '@circles-sdk/sdk';
  import { gnosisConfig } from '$lib/chiadoConfig';
  import { PrivateKeyContractRunner } from '@circles-sdk/adapter-ethers';
  import SeedphraseInput from '$lib/components/SeedphraseInput.svelte';
  import { ethers } from 'ethers';
  import { onMount } from 'svelte';
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';

  let mnemonicPhrase: string = $state('');
  let hasValidKey = $state(false);
  let privateKey = $state('');
  let address = $state('');

  const provider = new ethers.JsonRpcProvider(gnosisConfig.circlesRpcUrl);

  async function connectWallet() {
    localStorage.setItem('privateKey', privateKey);
    $wallet = await initializeWallet('circles');
    $circles = new Sdk($wallet!, gnosisConfig);
  }

  onMount(async () => {
    $wallet = undefined;
    if (localStorage.getItem('privateKey')) {
      privateKey = localStorage.getItem('privateKey')!;
      const walletRunner = new PrivateKeyContractRunner(provider, privateKey);
      await walletRunner.init();

      $wallet = walletRunner;
      $circles = new Sdk($wallet!, gnosisConfig);
      localStorage.setItem('walletType', 'circles');
    }
  });
</script>

<div
  class="w-full flex flex-col items-center min-h-screen p-4 max-w-5xl gap-y-8 mt-20"
>
  {#if !$wallet?.address || !$circles}
    <h2 class="font-bold text-[28px] md:text-[32px]">
      Import circles.garden keyphrase
    </h2>
    <p class="font-normal text-black/60 text-base">
      Please enter or paste your keyphrase from circles.garden below.
    </p>
    <SeedphraseInput
      bind:isValidMnemonic={hasValidKey}
      bind:privateKey
      bind:mnemonicPhrase
      bind:address
    />
    <button
      onclick={connectWallet}
      class="btn btn-sm"
      class:btn-disabled={!hasValidKey}>Import
    </button
    >
  {:else}
    <ConnectSafe safeOwnerAddress={$wallet?.address} chainId={100n} walletType="circles" />
  {/if}
</div>