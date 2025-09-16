<script lang="ts">
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import {
    clearSession,
    getSigner,
    initBrowserProviderContractRunner,
    initSafeSdkBrowserContractRunner,
    signer,
    wallet,
  } from '$lib/stores/wallet.svelte';
  import type { Address } from '@circles-sdk/utils';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import { type AvatarRow, type GroupRow } from '@circles-sdk/data';
  import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/utils/getGroupsByOwnerBatch';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import SettingsDropdown from '$lib/components/SettingsDropdown.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { onMount } from 'svelte';
  import { gnosisConfig } from '$lib/circlesConfig';
  import { Sdk } from '@circles-sdk/sdk';
  import type { SdkContractRunner } from '@circles-sdk/adapter';
  import { circles } from '$lib/stores/circles';
  let groupsByOwner: Record<Address, GroupRow[]> | undefined = $state();
  let avatarInfo: AvatarRow | undefined = $state();
  let runner: SdkContractRunner | undefined = $state();
  onMount(async () => {
    signer.address = await getSigner();
    if (!signer.address) {
      await clearSession();
      return;
    }
    runner = await initBrowserProviderContractRunner();
  });

  async function connectLegacy(address: Address) {
    runner = await initBrowserProviderContractRunner();
    wallet.set(runner);
    return new Sdk(
      runner,
      settings.ring ? gnosisConfig.rings : gnosisConfig.production
    );
  }

  async function connectSafe(address: Address) {
    runner = await initSafeSdkBrowserContractRunner(address);
    wallet.set(runner);
    return new Sdk(
      runner,
      settings.ring ? gnosisConfig.rings : gnosisConfig.production
    );
  }

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

  $effect(() => {
    (async () => {
      if (!signer.address || !$circles) return;
      groupsByOwner = await getBaseAndCmgGroupsByOwnerBatch($circles, [
        signer.address,
      ]);
      avatarInfo = await $circles.data.getAvatarInfo(signer.address);
    })();
  });
  function goBack(): void {
    history.back();
  }
</script>

<div class="page page-pt page-stack page--lg">
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
  {:else if settings.legacy}
    <ConnectCircles
      address={signer.address}
      isRegistered={avatarInfo !== undefined}
      groups={groupsByOwner?.[signer.address] ?? []}
      initSdk={connectLegacy}
    />
  {:else}
    <ConnectSafe
      safeOwnerAddress={signer.address}
      initSdk={connectSafe}
      sdk={$circles}
    />
  {/if}
</div>
