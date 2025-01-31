<script lang="ts">
  import { goto } from '$app/navigation';
  import { wallet } from '$lib/stores/wallet';
  import { circles } from '$lib/stores/circles';
  import { Sdk } from '@circles-sdk/sdk';
  import { gnosisConfig } from '$lib/circlesConfig';
  import { PrivateKeyContractRunner } from '@circles-sdk/adapter-ethers';
  import SeedphraseInput from '$lib/components/SeedphraseInput.svelte';
  import { ethers } from 'ethers';
  import { onMount } from 'svelte';

  let mnemonicPhrase: string = '';
  let hasValidKey = false;
  let privateKey = '';
  let address = '';

  const provider = new ethers.JsonRpcProvider(gnosisConfig.circlesRpcUrl);

  //
  // Connects the wallet and initializes the Circles SDK.
  //
  async function connectWallet() {
    if (!hasValidKey || address === '') {
      return;
    }

    const wallet = new PrivateKeyContractRunner(provider, privateKey);
    await wallet.init();

    localStorage.setItem('privateKey', privateKey);

    $wallet = wallet;

    // Initialize the Circles SDK and set it as $circles to make it globally available.
    $circles = new Sdk($wallet!, gnosisConfig);

    try {
      const request = await fetch(
        `https://static.174.163.76.144.clients.your-server.de/faucet/fund-me/${address}`
      );
      const response = await request.text();
    } catch (e) {
      console.error(`Couldn't fund address ${address}`, e);
    }

    await goto('/connect-wallet/select-safe');
  }

  onMount(async () => {
    localStorage.removeItem('useMM');
    localStorage.setItem('usePK', 'true');

    if (localStorage.getItem('privateKey')) {
      privateKey = localStorage.getItem('privateKey')!;
      const wallet = new PrivateKeyContractRunner(provider, privateKey);
      await wallet.init();

      $wallet = wallet;

      $circles = new Sdk($wallet!, gnosisConfig);

      await goto('/connect-wallet/select-safe');
    }
  });
</script>

<div
  class="w-full flex flex-col items-center min-h-screen p-4 max-w-5xl gap-y-8 mt-20"
>
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
    on:click={() => connectWallet()}
    class="btn btn-sm"
    class:btn-disabled={!hasValidKey}>Import</button
  >
</div>
