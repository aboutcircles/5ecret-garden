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
      try {
          // Try to recover an EOA if wagmi already has one
          signer.address = await getSigner();

          // Always prepare a browser runner; it will trigger the wallet when needed
          runner = await initBrowserProviderContractRunner();
      } catch (err) {
          // Do not clear/redirect here; let the user continue to the connect UI
          console.error('connect-safe onMount init failed:', err);
          runner = undefined;
      }
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

  async function refreshGroups() {
      if (!signer.address || !$circles) return;
      groupsByOwner = await getBaseAndCmgGroupsByOwnerBatch($circles, [
          signer.address,
      ]);
  }
</script>

<div class="page page-pt page-stack page--lg">
  <div class="toolbar">
    <button type="button" class="back-btn" aria-label="Back" onclick={goBack}>
      <img src="/arrow-left.svg" alt="Back" class="icon mr-4" />
        <h1 class="h2">Select Account</h1>
    </button>
    <div class="flex-grow"></div>
<!--    <SettingsDropdown />-->
  </div>

  <p class="muted">Please select the account you want to use from the list below.</p>

  {#if !signer.address || !$circles}
    <WalletLoader />
  {:else if settings.legacy}
    <ConnectCircles
      address={signer.address}
      isRegistered={avatarInfo !== undefined}
      groups={groupsByOwner?.[signer.address] ?? []}
      initSdk={connectLegacy}
      refreshGroupsCallback={refreshGroups}
    />
  {:else if $circles}
    <ConnectSafe
      safeOwnerAddress={signer.address}
      initSdk={connectSafe}
      sdk={$circles}
      refreshGroupsCallback={refreshGroups}
    />
  {/if}
</div>
