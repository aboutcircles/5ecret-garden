<script lang="ts">
  import SelectAvatarPage from '$lib/areas/wallet/ui/onboarding/SelectAvatarPage.svelte';
  import {
    getSigner,
    initBrowserProviderContractRunner,
    initSafeSdkBrowserContractRunner,
    signer,
    wallet,
  } from '$lib/shared/state/wallet.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { type AvatarRow, type GroupRow } from '@circles-sdk/data';
  import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/shared/utils/getGroupsByOwnerBatch';
  import { settings } from '$lib/shared/state/settings.svelte';
  import { onMount } from 'svelte';
  import { gnosisConfig } from '$lib/shared/config/circles';
  import { Sdk } from '@circles-sdk/sdk';
  import type { SdkContractRunner } from '@circles-sdk/adapter';
  import { circles } from '$lib/shared/state/circles';
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

<SelectAvatarPage
  isLoading={!signer.address || !$circles}
  onBack={goBack}
  safeOwnerAddress={signer.address}
  sdk={$circles}
  initSdk={connectSafe}
  safeCreationMode="browser"
  refreshGroupsCallback={refreshGroups}
  legacy={settings.legacy && signer.address
    ? {
        address: signer.address,
        isRegistered: avatarInfo !== undefined,
        groups: groupsByOwner?.[signer.address] ?? [],
        initSdk: connectLegacy,
        refreshGroupsCallback: refreshGroups,
      }
    : undefined}
/>
