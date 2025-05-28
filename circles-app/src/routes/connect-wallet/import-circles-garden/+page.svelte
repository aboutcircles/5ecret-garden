<script lang="ts">
  import { initializeWallet, wallet } from '$lib/stores/wallet.svelte';
  import { circles } from '$lib/stores/circles';
  import { Sdk } from '@circles-sdk/sdk';
  import SeedphraseInput from '$lib/components/SeedphraseInput.svelte';
  import { onMount } from 'svelte';
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import { CirclesStorage } from '$lib/utils/storage';
  import { getCirclesConfig } from '$lib/utils/helpers';
  import { environment } from '$lib/stores/environment.svelte';

  let mnemonicPhrase: string = $state('');
  let hasValidKey = $state(false);
  let privateKey: string = $state('');
  let address = $state('');

  async function connectWallet() {
    CirclesStorage.getInstance().data = {
      privateKey: privateKey,
      walletType: 'circles'
    };
    $wallet = await initializeWallet('circles');
    const network = await ($wallet as any).provider?.getNetwork();
    const circlesConfig = await getCirclesConfig(network.chainId, environment.ring);
    $circles = new Sdk($wallet!, circlesConfig);
  }

  onMount(async () => {
    $wallet = undefined;
    privateKey = CirclesStorage.getInstance().privateKey ?? "";
    if (privateKey) {
      CirclesStorage.getInstance().data = {
        walletType: 'circles'
      };
      $wallet = await initializeWallet('circles');
    const network = await ($wallet as any).provider?.getNetwork();
    const circlesConfig = await getCirclesConfig(network.chainId, environment.ring);
      $circles = new Sdk($wallet!, circlesConfig);
    }
  });
</script>

<div
  class="w-full flex flex-col items-center min-h-screen max-w-5xl gap-y-8 mt-20"
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
    </button>
  {:else}
    <ConnectSafe safeOwnerAddress={$wallet?.address} chainId={100n} walletType="circles" />
  {/if}
</div>