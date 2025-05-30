<script lang="ts">
  import {
    initPrivateKeyContractRunner,
    initSafeSdkPrivateKeyContractRunner,
    signer,
  } from '$lib/stores/wallet.svelte';
  import { circles } from '$lib/stores/circles';
  import { Sdk } from '@circles-sdk/sdk';
  import SeedphraseInput from '$lib/components/SeedphraseInput.svelte';
  import { onMount } from 'svelte';
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import { CirclesStorage } from '$lib/utils/storage';
  import { getCirclesConfig } from '$lib/utils/helpers';
  import { settings } from '$lib/stores/settings.svelte';
  import { gnosisConfig } from '$lib/circlesConfig';
  import type { SdkContractRunner } from '@circles-sdk/adapter';
  import type { Address } from '@circles-sdk/utils';

  let runner: SdkContractRunner | undefined = $state();
  let mnemonicPhrase: string = $state('');
  let hasValidKey = $state(false);
  let privateKey: string = $state('');
  let address = $state('');

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

  async function connectWallet(address?: Address) {
    CirclesStorage.getInstance().data = {
      privateKey: privateKey,
    };
    if (address) {
      runner = await initSafeSdkPrivateKeyContractRunner(privateKey, address);
    } else {
      runner = await initPrivateKeyContractRunner(privateKey);
    }

    return new Sdk(
      runner,
      settings.ring ? gnosisConfig.rings : gnosisConfig.production
    );
  }

  onMount(async () => {
    privateKey = CirclesStorage.getInstance().privateKey ?? '';
    if (privateKey) {
      CirclesStorage.getInstance().data = {
        walletType: 'circles',
      };
      runner = await initPrivateKeyContractRunner(privateKey);
      const network = await (runner as any).provider?.getNetwork();
      const circlesConfig = await getCirclesConfig(
        network.chainId,
        settings.ring
      );
      $circles = new Sdk(runner, circlesConfig);
      signer.address = runner.address;
    }
  });
</script>

<div
  class="w-full flex flex-col items-center min-h-screen max-w-5xl gap-y-8 mt-20"
>
  {#if !signer.address || !$circles}
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
      onclick={async () =>  {$circles = await connectWallet()}}
      class="btn btn-sm"
      class:btn-disabled={!hasValidKey}
      >Import
    </button>
  {:else}
    <ConnectSafe
      safeOwnerAddress={signer.address}
      initSdk={connectWallet}
      sdk={$circles}
    />
  {/if}
</div>
