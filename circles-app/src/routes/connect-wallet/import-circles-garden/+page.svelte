<script lang="ts">
  import SelectAvatarPage from '$lib/areas/wallet/ui/onboarding/SelectAvatarPage.svelte';
  import {
    clearSession,
    getSignerFromPk,
    initNewSafeContractRunner,
    signer,
    wallet,
  } from '$lib/shared/state/wallet.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { Sdk } from '@aboutcircles/sdk';
  import { onMount } from 'svelte';
  import { settings } from '$lib/shared/state/settings.svelte';
  import { gnosisConfig } from '$lib/shared/config/circles';
  import type { Address } from '@aboutcircles/sdk-types';

  $effect(() => {
    // Create a read-only Sdk (no contractRunner) for avatar discovery
    if (signer.address) {
      const config = settings.ring ? gnosisConfig.rings : gnosisConfig.production;
      circles.set(new Sdk(config));
    }
  });

  async function connectCirclesGarden(address: Address) {
    if (!signer.privateKey) {
      throw new Error('No private key found');
    }
    const runner = await initNewSafeContractRunner(
      signer.privateKey,
      address
    );
    wallet.set(runner);

    const config = settings.ring ? gnosisConfig.rings : gnosisConfig.production;
    const sdk = new Sdk(config, runner);
    circles.set(sdk);
    return sdk;
  }

  onMount(async () => {
    const { address, privateKey } = (await getSignerFromPk()) ?? {};
    if (!address || !privateKey) {
      await clearSession();
      return;
    }

    signer.address = address;
    signer.privateKey = privateKey;
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
