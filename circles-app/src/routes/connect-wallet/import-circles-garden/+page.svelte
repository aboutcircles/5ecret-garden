<script lang="ts">
  import SelectAvatarPage from '$lib/areas/wallet/ui/onboarding/SelectAvatarPage.svelte';
  import {
    clearSession,
    getSignerFromPk,
    initPrivateKeyContractRunner,
    initSafeSdkPrivateKeyContractRunner,
    signer,
    wallet,
  } from '$lib/shared/state/wallet.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { Sdk } from '@circles-sdk/sdk';
  import { onMount } from 'svelte';
  import { settings } from '$lib/shared/state/settings.svelte';
  import { gnosisConfig } from '$lib/shared/config/circles';
  import type { SdkContractRunner } from '@circles-sdk/adapter';
  import type { Address } from '@circles-sdk/utils';

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

<SelectAvatarPage
  sizeClass="page--md"
  isLoading={!signer.address || !$circles}
  onBack={goBack}
  safeOwnerAddress={signer.address}
  sdk={$circles}
  initSdk={connectCirclesGarden}
  safeCreationMode="importedKey"
/>
