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

  let importError: string | null = $state(null);

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
    try {
      const { address, privateKey } = (await getSignerFromPk()) ?? {};
      if (!address || !privateKey) {
        await clearSession();
        importError = 'No imported key found on this device. Use Connect wallet to import or connect again.';
        return;
      }

      signer.address = address;
      signer.privateKey = privateKey;
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
