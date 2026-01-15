<script lang="ts">
  import {
    clearSession,
    getSignerFromPk,
    initNewSafeContractRunner,
    signer,
  } from '$lib/stores/wallet.svelte';
  import { circles } from '$lib/stores/circles';
  import { Sdk } from '@aboutcircles/sdk';
  import { gnosisConfig } from '$lib/circlesConfig';
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import { GroupType } from '@aboutcircles/sdk-types';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import SettingsDropdown from '$lib/components/SettingsDropdown.svelte';
  import { onMount } from 'svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { CirclesStorage } from '$lib/utils/storage';
  import { goto } from '$app/navigation';

  onMount(async () => {
    const { address, privateKey } = (await getSignerFromPk()) ?? {};
    if (!address || !privateKey) {
      await clearSession();
      return;
    }

    signer.address = address;
    signer.privateKey = privateKey;

    // Initialize SDK for querying
    try {
      const sdk = new Sdk(gnosisConfig.production);
      circles.set(sdk);
    } catch (err) {
      console.error('Failed to initialize SDK:', err);
    }
  });

  async function connectCirclesGarden(
    safeAddress: Address,
    targetAddress?: Address
  ) {
    if (!signer.privateKey) {
      throw new Error('No private key found');
    }

    // Use targetAddress if provided (for groups), otherwise use safeAddress
    const addressToConnect = targetAddress ?? safeAddress;

    // Always create runner with the Safe address (the one controlled by the EOA)
    const runner = await initNewSafeContractRunner(
      signer.privateKey,
      safeAddress as Address
    );

    const sdk = new Sdk(gnosisConfig.production, runner);
    circles.set(sdk);

    // Get avatar info for the target address (could be Safe or Group)
    // Enable auto event subscription for reactive balance/transaction updates
    const avatar = await sdk.getAvatar(addressToConnect, true);

    if (!avatar) {
      console.error('Failed to get avatar for address:', addressToConnect);
      await goto('/register');
      return sdk;
    }

    avatarState.avatar = avatar;

    // Detect avatar type from the avatarInfo
    const avatarType = (avatar.avatarInfo as any)?.type;

    if (avatarType === 'CrcV2_RegisterGroup') {
      avatarState.isGroup = true;
      avatarState.isHuman = false;
      avatarState.groupType = GroupType.Standard;
    } else if (avatarType === 'CrcV2_RegisterOrganization') {
      avatarState.isGroup = false;
      avatarState.isHuman = false;
      avatarState.groupType = undefined;
    } else {
      avatarState.isGroup = false;
      avatarState.isHuman = true;
      avatarState.groupType = undefined;
    }

    // Store in CirclesStorage
    CirclesStorage.getInstance().data = {
      privateKey: signer.privateKey,
      avatar: safeAddress, // Store the Safe address
      group: avatarState.isGroup ? addressToConnect : undefined, // Store group address if applicable
      isGroup: avatarState.isGroup,
      groupType: avatarState.groupType,
    };

    // Navigate to dashboard
    await goto('/dashboard');

    return sdk;
  }

  function goBack(): void {
    history.back();
  }
</script>

<div class="page page-pt page-stack page--lg">
  <div class="toolbar">
    <button type="button" class="back-btn" aria-label="Back" onclick={goBack}>
      <img src="/arrow-left.svg" alt="Back" class="icon mr-4" />
      <h1 class="h2">Select Account</h1>
    </button>
    <div class="flex-grow"></div>
    <SettingsDropdown />
  </div>

  <p class="muted">
    Please select the account you want to use from the list below.
  </p>

  {#if !signer.address || !$circles}
    <WalletLoader />
    {#if signer.address}
      <p class="muted">Waiting for SDK to initialize...</p>
    {/if}
  {:else}
    <ConnectSafe
      safeOwnerAddress={signer.address}
      initSdk={connectCirclesGarden}
      sdk={$circles}
    />
  {/if}
</div>
