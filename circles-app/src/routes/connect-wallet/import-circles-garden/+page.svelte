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
  let importError: string | null = $state(null);

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
    try {
      const { address, privateKey } = (await getSignerFromPk()) ?? {};
      if (!address || !privateKey) {
        await clearSession();
        importError = 'No imported key found on this device. Use Connect wallet to import or connect again.';
        return;
      }

      signer.address = address;
      signer.privateKey = privateKey;
      runner = await initPrivateKeyContractRunner(privateKey);
    } catch (e) {
      importError = e instanceof Error ? e.message : String(e);
    }
  });

  function goBack(): void {
    history.back();
  }
</script>

{#if importError}
  <div style="display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;min-height:60vh;padding:24px;text-align:center;">
    <div style="font-size:15px;font-weight:600;color:#0F0A1E;">Couldn't import account</div>
    <div style="font-size:13px;color:rgba(15,10,30,0.62);max-width:420px;line-height:1.5;">{importError}</div>
    <button type="button" onclick={goBack} style="height:36px;padding:0 16px;border-radius:9999px;border:1px solid rgba(15,10,30,0.12);background:#FFFFFF;color:#0F0A1E;font-size:13px;font-weight:540;cursor:pointer;">Go back</button>
  </div>
{:else}
  <SelectAvatarPage
    sizeClass="page--md"
    isLoading={!signer.address || !$circles}
    onBack={goBack}
    safeOwnerAddress={signer.address}
    sdk={$circles}
    initSdk={connectCirclesGarden}
    safeCreationMode="importedKey"
  />
{/if}
